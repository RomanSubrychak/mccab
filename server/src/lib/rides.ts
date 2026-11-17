import { createHmac } from "node:crypto";

import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

// Shared by routes/rides.ts and routes/me.ts: what a ride looks like to each
// student, and the status changes that happen outside the ride routes.

// Everything needed to show a ride to anyone. Private fields (phones, plate,
// addresses, coordinates) are loaded here and removed in toRideView.
export const RIDE_INCLUDE = {
  driver: {
    select: {
      id: true,
      name: true,
      phone: true,
      phoneVisibility: true,
      vehicle: { select: { make: true, model: true, color: true, plate: true } },
    },
  },
  bookings: {
    select: {
      id: true,
      status: true,
      riderId: true,
      createdAt: true,
      rider: {
        select: {
          id: true,
          name: true,
          homeArea: true,
          homeAddress: true,
          phone: true,
          phoneVisibility: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.RideInclude;

export type RideRow = Prisma.RideGetPayload<{ include: typeof RIDE_INCLUDE }>;

// The student looking at the ride.
export type Viewer = { id: number; homeLat: number | null; homeLng: number | null };

// How long after departure the people in a ride can still see each other's
// phone, car and pickup address (e.g. to sort out something left in the car).
const CONTACT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function seatsTaken(ride: Pick<RideRow, "bookings">): number {
  return ride.bookings.filter((booking) => booking.status === "ACCEPTED").length;
}

// Only the first name is shown to other students.
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

// A phone number is shared only inside a confirmed ride, and only if its owner allows it.
function sharedPhone(user: { phone: string | null; phoneVisibility: string }): string | null {
  return user.phoneVisibility === "CONFIRMED_RIDES" ? user.phone : null;
}

// The ride as the viewer may see it:
// - Everyone: the driver's first name, startArea, time, seats, price, and the
//   distance from their own home (rounded to 0.5 km). Never coordinates.
// - The driver: every booking, with each rider's first name and area. The
//   rider's pickup address and phone only once the driver has accepted them.
// - A rider: their own booking. The driver's phone and car only once accepted.
// Contact details stop being shared when the ride is cancelled, and a day
// after it leaves (see contactShared).
export function toRideView(ride: RideRow, viewer: Viewer) {
  const isMine = ride.driverId === viewer.id;
  const myBooking = ride.bookings.find((booking) => booking.riderId === viewer.id) ?? null;
  const sharing = contactShared(ride);
  const confirmed = sharing && myBooking?.status === "ACCEPTED";

  return {
    id: ride.id,
    campus: ride.campus,
    direction: ride.direction,
    departAt: ride.departAt.toISOString(),
    seatsOffered: ride.seatsOffered,
    seatsLeft: Math.max(0, ride.seatsOffered - seatsTaken(ride)),
    pricePerSeatCents: ride.pricePerSeatCents,
    startArea: ride.startArea,
    notes: ride.notes,
    status: ride.status,
    distanceKm: isMine ? null : distanceKm(viewer, ride),
    isMine,
    driver: {
      id: ride.driver.id,
      firstName: firstName(ride.driver.name),
      phone: confirmed ? sharedPhone(ride.driver) : null,
      vehicle: confirmed ? ride.driver.vehicle : null,
    },
    myBooking: myBooking && { id: myBooking.id, status: myBooking.status },
    bookings: isMine
      ? ride.bookings.map((booking) => {
          const accepted = sharing && booking.status === "ACCEPTED";
          return {
            id: booking.id,
            status: booking.status,
            createdAt: booking.createdAt.toISOString(),
            rider: {
              id: booking.rider.id,
              firstName: firstName(booking.rider.name),
              area: booking.rider.homeArea,
              phone: accepted ? sharedPhone(booking.rider) : null,
              pickupAddress: accepted ? booking.rider.homeAddress : null,
            },
          };
        })
      : null,
  };
}

export type RideView = ReturnType<typeof toRideView>;

// Contact details are shared only for rides that are happening: open, or
// completed less than a day ago. Never for cancelled rides, and not forever:
// a past driver shouldn't keep seeing a rider's current home address.
function contactShared(ride: Pick<RideRow, "status" | "departAt">): boolean {
  if (ride.status === "OPEN") return true;
  return ride.status === "COMPLETED" && Date.now() - ride.departAt.getTime() < CONTACT_WINDOW_MS;
}

// The point a driver's rides are measured from: their home moved 250 to 500 m
// in a fixed direction. Distances are public (to 0.5 km), and from the exact
// home a student could find it by searching from a few addresses of their own.
// The shift is the same for every ride of a driver, so it can't be averaged
// out; it's derived from JWT_SECRET, so it can't be worked out either.
export function approximateStart(driverId: number, lat: number, lng: number) {
  const hash = createHmac("sha256", `ride-start:${process.env.JWT_SECRET}`)
    .update(String(driverId))
    .digest();
  const bearing = (hash.readUInt16BE(0) / 65536) * 2 * Math.PI;
  const metres = 250 + (hash.readUInt16BE(2) / 65536) * 250;
  const dLat = (metres * Math.cos(bearing)) / 111_320;
  const dLng = (metres * Math.sin(bearing)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

// Straight-line distance between the viewer's home and the ride's off-campus
// end, rounded to the nearest 0.5 km. null if the viewer has no home address.
function distanceKm(viewer: Viewer, ride: Pick<RideRow, "startLat" | "startLng">): number | null {
  if (viewer.homeLat === null || viewer.homeLng === null) return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(ride.startLat - viewer.homeLat);
  const dLng = toRad(ride.startLng - viewer.homeLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(viewer.homeLat)) * Math.cos(toRad(ride.startLat)) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(km * 2) / 2;
}

// Marks open rides whose time has passed as COMPLETED, and cancels requests
// the driver never answered. Called before rides are read, so nothing needs
// to run on a timer.
export async function completePastRides() {
  const past = await prisma.ride.findMany({
    where: { status: "OPEN", departAt: { lte: new Date() } },
    select: { id: true },
  });
  if (past.length === 0) return;
  const ids = past.map((ride) => ride.id);
  await prisma.$transaction([
    prisma.ride.updateMany({ where: { id: { in: ids } }, data: { status: "COMPLETED" } }),
    prisma.booking.updateMany({
      where: { rideId: { in: ids }, status: "REQUESTED" },
      data: { status: "CANCELLED" },
    }),
  ]);
}

type Db = Prisma.TransactionClient | typeof prisma;

// Cancels rides and every booking still requested or accepted on them.
export async function cancelRides(db: Db, rideIds: number[]) {
  if (rideIds.length === 0) return;
  await db.ride.updateMany({ where: { id: { in: rideIds } }, data: { status: "CANCELLED" } });
  await db.booking.updateMany({
    where: { rideId: { in: rideIds }, status: { in: ["REQUESTED", "ACCEPTED"] } },
    data: { status: "CANCELLED" },
  });
}

// Cancels a driver's upcoming open rides, e.g. when they remove their car or
// licence or stop being a driver: they can't drive those rides anymore.
export async function cancelUpcomingRides(db: Db, driverId: number) {
  const rides = await db.ride.findMany({
    where: { driverId, status: "OPEN", departAt: { gt: new Date() } },
    select: { id: true },
  });
  await cancelRides(
    db,
    rides.map((ride) => ride.id),
  );
}
