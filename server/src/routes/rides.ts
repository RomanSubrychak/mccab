import { Request, Response, Router } from "express";

import { RideDirection } from "../generated/prisma/client";
import { chicagoDate, chicagoDayRange, todayInChicago } from "../lib/dates";
import {
  DRIVER_SETUP_MESSAGES,
  MAX_PRICE_PER_SEAT_CENTS,
  MAX_SEATS,
  driverStatus,
} from "../lib/driver";
import { prisma } from "../lib/prisma";
import {
  RIDE_INCLUDE,
  type RideRow,
  type Viewer,
  approximateStart,
  cancelRides,
  completePastRides,
  seatsTaken,
  toRideView,
} from "../lib/rides";
import { FieldError, oneOf, optionalInt, optionalText, sendFieldError } from "../lib/validation";
import { currentUserId, requireAuth } from "../middleware/require-auth";

// Rides and bookings. Every route needs a signed-in student (see requireAuth).
// Payments happen outside the app: rides only show a price per seat.
export const ridesRoutes = Router();
export const bookingsRoutes = Router();
export const myRidesRoutes = Router();
ridesRoutes.use(requireAuth);
bookingsRoutes.use(requireAuth);
myRidesRoutes.use(requireAuth);

const CAMPUSES = ["CHICAGO_MAIN", "CHICAGO_DOWNTOWN", "NAPERVILLE", "EVERGREEN_PARK"] as const;
const DIRECTIONS = ["TO_CAMPUS", "FROM_CAMPUS"] as const;
const MAX_DAYS_AHEAD = 30;
const SEARCH_LIMIT = 50;

// An expected refusal (404, 403, 409, ...), sent to the app as { error }.
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

function sendError(res: Response, err: unknown) {
  if (sendFieldError(res, err)) return;
  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json(err.field ? { error: err.message, field: err.field } : { error: err.message });
    return;
  }
  throw err;
}

// Wraps a route so FieldError and HttpError become their responses.
function handle(route: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await route(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
}

function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, "This ride doesn't exist.");
  return id;
}

async function loadViewer(userId: number): Promise<Viewer> {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, homeLat: true, homeLng: true },
  });
}

async function loadRide(id: number): Promise<RideRow> {
  const ride = await prisma.ride.findUnique({ where: { id }, include: RIDE_INCLUDE });
  if (!ride) throw new HttpError(404, "This ride doesn't exist.");
  return ride;
}

// The ride as the current student sees it, freshly loaded.
async function rideResponse(rideId: number, userId: number) {
  const [ride, viewer] = await Promise.all([loadRide(rideId), loadViewer(userId)]);
  return { ride: toRideView(ride, viewer) };
}

// A future moment from an ISO string with a time zone, e.g. "2026-11-20T07:30:00-06:00".
// The offset (or Z) is required: without it the server's own time zone would be used.
function departAtField(value: unknown): Date {
  const hasZone = typeof value === "string" && /(Z|[+-]\d{2}:\d{2})$/.test(value);
  const date = hasZone ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new FieldError("departAt", "Choose the date and time you leave.");
  }
  if (date.getTime() <= Date.now()) {
    throw new FieldError("departAt", "Choose a time in the future.");
  }
  const lastDay = chicagoDate(new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000));
  if (chicagoDate(date) > lastDay) {
    throw new FieldError("departAt", `Rides can be posted up to ${MAX_DAYS_AHEAD} days ahead.`);
  }
  return date;
}

// ---- Rides ----

// POST /rides  { direction, departAt, campus?, seats?, pricePerSeatCents?, notes? } -> 201 { ride }
// campus, seats and price default to the driver's profile. The ride starts or
// ends at the driver's home area.
ridesRoutes.post(
  "/",
  handle(async (req, res) => {
    const body = req.body ?? {};
    const userId = currentUserId(res);
    const driver = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        rideRole: true,
        campus: true,
        pricePerSeatCents: true,
        homeArea: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        licenceLast4: true,
        licenceExpiresOn: true,
        vehicle: { select: { seats: true } },
      },
    });

    if (driver.rideRole !== "DRIVER" && driver.rideRole !== "RIDER_DRIVER") {
      throw new HttpError(403, "Switch to Driver or Rider & Driver to offer rides.");
    }
    const status = driverStatus(driver);
    if (!status.ready) {
      throw new HttpError(400, DRIVER_SETUP_MESSAGES[status.missing[0]]);
    }
    if (
      !driver.homeAddress ||
      !driver.homeArea ||
      driver.homeLat === null ||
      driver.homeLng === null
    ) {
      throw new HttpError(400, "Add your home address on My route before offering a ride.");
    }

    const carSeats = Math.min(driver.vehicle!.seats, MAX_SEATS);
    const seats = optionalInt(
      "seats",
      body.seats ?? carSeats,
      1,
      carSeats,
      carSeats === 1 ? "Your car has 1 seat for riders." : `Offer 1 to ${carSeats} seats.`,
    )!;
    const price = optionalInt(
      "pricePerSeatCents",
      body.pricePerSeatCents ?? driver.pricePerSeatCents,
      0,
      MAX_PRICE_PER_SEAT_CENTS,
      `Enter a price between $0 and $${MAX_PRICE_PER_SEAT_CENTS / 100}.`,
    );
    if (price === null) throw new FieldError("pricePerSeatCents", "Enter a price per seat.");

    // Not the exact home: see approximateStart.
    const start = approximateStart(userId, driver.homeLat, driver.homeLng);
    const startPoint = { startLat: start.lat, startLng: start.lng };

    const ride = await prisma.ride.create({
      data: {
        driverId: userId,
        campus: oneOf("campus", body.campus ?? driver.campus, CAMPUSES),
        direction: oneOf("direction", body.direction, DIRECTIONS),
        departAt: departAtField(body.departAt),
        seatsOffered: seats,
        pricePerSeatCents: price,
        startArea: driver.homeArea,
        ...startPoint,
        notes: body.notes === undefined ? null : optionalText("notes", body.notes, 200),
      },
      include: RIDE_INCLUDE,
    });
    res.status(201).json({ ride: toRideView(ride, await loadViewer(userId)) });
  }),
);

// GET /rides?campus=&direction=&date=YYYY-MM-DD -> 200 { rides }
// Open, upcoming rides by other drivers that still have a seat (or that the
// student already asked to join). Nearest to the student's home first, then
// soonest. campus defaults to the student's campus; date is a Chicago date.
ridesRoutes.get(
  "/",
  handle(async (req, res) => {
    const userId = currentUserId(res);
    await completePastRides();
    const me = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, campus: true, homeLat: true, homeLng: true },
    });

    const campus = oneOf("campus", req.query.campus ?? me.campus ?? undefined, CAMPUSES);
    const direction =
      req.query.direction === undefined
        ? undefined
        : (oneOf("direction", req.query.direction, DIRECTIONS) as RideDirection);
    let departAt: { gt: Date; gte?: Date; lt?: Date } = { gt: new Date() };
    if (req.query.date !== undefined) {
      const date = String(req.query.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayInChicago()) {
        throw new FieldError("date", "Choose today or a later date.");
      }
      const { start, end } = chicagoDayRange(date);
      departAt = { gt: new Date(), gte: start, lt: end };
    }

    const rides = await prisma.ride.findMany({
      where: { status: "OPEN", campus, direction, departAt, driverId: { not: userId } },
      include: RIDE_INCLUDE,
      orderBy: { departAt: "asc" },
      take: SEARCH_LIMIT,
    });
    const views = rides
      .map((ride) => toRideView(ride, me))
      .filter((ride) => ride.seatsLeft > 0 || ride.myBooking !== null)
      .sort(
        (a, b) =>
          (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
          a.departAt.localeCompare(b.departAt),
      );
    res.json({ rides: views });
  }),
);

// GET /rides/:id -> 200 { ride }
ridesRoutes.get(
  "/:id",
  handle(async (req, res) => {
    await completePastRides();
    res.json(await rideResponse(idParam(req), currentUserId(res)));
  }),
);

// POST /rides/:id/cancel -> 200 { ride }
// The driver cancels an upcoming ride. Its bookings are cancelled too.
ridesRoutes.post(
  "/:id/cancel",
  handle(async (req, res) => {
    const userId = currentUserId(res);
    await completePastRides();
    const ride = await loadRide(idParam(req));
    if (ride.driverId !== userId) throw new HttpError(403, "Only the driver can cancel this ride.");
    if (ride.status !== "OPEN")
      throw new HttpError(409, "This ride has already ended or been cancelled.");
    await prisma.$transaction((tx) => cancelRides(tx, [ride.id]));
    res.json(await rideResponse(ride.id, userId));
  }),
);

// ---- Bookings ----

// POST /rides/:id/bookings -> 201 { ride }
// The student asks for a seat. The driver then accepts or declines.
ridesRoutes.post(
  "/:id/bookings",
  handle(async (req, res) => {
    const userId = currentUserId(res);
    await completePastRides();
    const ride = await loadRide(idParam(req));
    const rider = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { rideRole: true, homeAddress: true },
    });

    if (ride.driverId === userId)
      throw new HttpError(409, "You can't book a seat on your own ride.");
    if (rider.rideRole === "DRIVER") {
      throw new HttpError(403, "Switch to Rider or Rider & Driver to book seats.");
    }
    if (!rider.homeAddress) {
      throw new HttpError(400, "Add your home address on My route first. It's your pickup point.");
    }
    if (ride.status !== "OPEN")
      throw new HttpError(409, "This ride has already left or been cancelled.");
    if (seatsTaken(ride) >= ride.seatsOffered) throw new HttpError(409, "This ride is full.");

    const existing = ride.bookings.find((booking) => booking.riderId === userId);
    if (existing?.status === "REQUESTED" || existing?.status === "ACCEPTED") {
      throw new HttpError(409, "You've already asked for a seat on this ride.");
    }
    if (existing?.status === "DECLINED") {
      throw new HttpError(409, "The driver declined your request for this ride.");
    }
    if (existing) {
      // Cancelled before: ask again.
      await prisma.booking.update({ where: { id: existing.id }, data: { status: "REQUESTED" } });
    } else {
      await prisma.booking.create({ data: { rideId: ride.id, riderId: userId } });
    }
    res.status(201).json(await rideResponse(ride.id, userId));
  }),
);

async function loadBooking(req: Request) {
  const id = Number(req.params.id);
  const booking = Number.isInteger(id)
    ? await prisma.booking.findUnique({
        where: { id },
        include: { ride: { select: { id: true, driverId: true, status: true } } },
      })
    : null;
  if (!booking) throw new HttpError(404, "This booking doesn't exist.");
  return booking;
}

// POST /bookings/:id/accept -> 200 { ride }
// The driver confirms a seat. The ride row is locked while the free seats are
// counted, so two accepts at the same moment can't both take the last seat.
bookingsRoutes.post(
  "/:id/accept",
  handle(async (req, res) => {
    const userId = currentUserId(res);
    await completePastRides();
    const booking = await loadBooking(req);
    if (booking.ride.driverId !== userId) {
      throw new HttpError(403, "Only the driver can answer this request.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Ride" WHERE id = ${booking.rideId} FOR UPDATE`;
      const ride = await tx.ride.findUniqueOrThrow({
        where: { id: booking.rideId },
        select: { status: true, seatsOffered: true },
      });
      if (ride.status !== "OPEN") {
        throw new HttpError(409, "This ride has already left or been cancelled.");
      }
      const accepted = await tx.booking.count({
        where: { rideId: booking.rideId, status: "ACCEPTED" },
      });
      if (accepted >= ride.seatsOffered) throw new HttpError(409, "All the seats are taken.");
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: "REQUESTED" },
        data: { status: "ACCEPTED" },
      });
      if (updated.count === 0)
        throw new HttpError(409, "This request was already answered or cancelled.");
    });
    res.json(await rideResponse(booking.rideId, userId));
  }),
);

// POST /bookings/:id/decline -> 200 { ride }
bookingsRoutes.post(
  "/:id/decline",
  handle(async (req, res) => {
    const userId = currentUserId(res);
    const booking = await loadBooking(req);
    if (booking.ride.driverId !== userId) {
      throw new HttpError(403, "Only the driver can answer this request.");
    }
    const updated = await prisma.booking.updateMany({
      where: { id: booking.id, status: "REQUESTED" },
      data: { status: "DECLINED" },
    });
    if (updated.count === 0)
      throw new HttpError(409, "This request was already answered or cancelled.");
    res.json(await rideResponse(booking.rideId, userId));
  }),
);

// POST /bookings/:id/cancel -> 200 { ride }
// The rider cancels their request or their confirmed seat, before the ride leaves.
bookingsRoutes.post(
  "/:id/cancel",
  handle(async (req, res) => {
    const userId = currentUserId(res);
    await completePastRides();
    const booking = await loadBooking(req);
    if (booking.riderId !== userId) throw new HttpError(403, "This isn't your booking.");
    if (booking.ride.status !== "OPEN") {
      throw new HttpError(409, "This ride has already left or been cancelled.");
    }
    const updated = await prisma.booking.updateMany({
      where: { id: booking.id, status: { in: ["REQUESTED", "ACCEPTED"] } },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 0) throw new HttpError(409, "This booking is already closed.");
    res.json(await rideResponse(booking.rideId, userId));
  }),
);

// ---- My rides ----

// GET /me/rides -> 200 { driving, riding }
// Rides the student offers, and rides they asked to join, from today (Chicago
// time) on, soonest first. Includes cancelled and declined ones so the app can
// say what happened.
myRidesRoutes.get(
  "/",
  handle(async (req, res) => {
    const userId = currentUserId(res);
    await completePastRides();
    const viewer = await loadViewer(userId);
    const since = chicagoDayRange(todayInChicago()).start;
    const [driving, riding] = await Promise.all([
      prisma.ride.findMany({
        where: { driverId: userId, departAt: { gte: since } },
        include: RIDE_INCLUDE,
        orderBy: { departAt: "asc" },
      }),
      prisma.ride.findMany({
        where: { departAt: { gte: since }, bookings: { some: { riderId: userId } } },
        include: RIDE_INCLUDE,
        orderBy: { departAt: "asc" },
      }),
    ]);
    res.json({
      driving: driving.map((ride) => toRideView(ride, viewer)),
      riding: riding.map((ride) => toRideView(ride, viewer)),
    });
  }),
);
