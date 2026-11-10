import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";

import { Prisma } from "../generated/prisma/client";
import { signToken } from "../lib/auth-token";
import { BCRYPT_ROUNDS, MAX_PASSWORD_BYTES, validateNewPassword } from "../lib/password-strength";
import { prisma } from "../lib/prisma";
import { currentUserId, requireAuth } from "../middleware/require-auth";

// Routes for the signed-in user's own profile and account. Every route needs a
// valid login token (see requireAuth).
export const meRoutes = Router();
meRoutes.use(requireAuth);

const RIDE_ROLES = ["RIDER", "DRIVER", "RIDER_DRIVER"] as const;
const RIDE_MODES = ["RIDING", "DRIVING"] as const;
const CAMPUSES = ["CHICAGO_MAIN", "CHICAGO_DOWNTOWN", "NAPERVILLE", "EVERGREEN_PARK"] as const;
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const CHAT_PREFERENCES = ["QUIET", "SOME", "CHATTY"] as const;
const PHONE_VISIBILITIES = ["CONFIRMED_RIDES", "NOBODY"] as const;

// prettier-ignore
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
] as const;

const MAX_PRICE_PER_SEAT_CENTS = 2500; // $25
const MAX_SEATS = 3;

// Everything the profile page shows. passwordHash and tokenVersion are never sent.
const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  phone: true,
  bio: true,
  major: true,
  graduationYear: true,
  rideRole: true,
  activeMode: true,
  termsAcceptedAt: true,
  campus: true,
  homeArea: true,
  rideDays: true,
  arriveBy: true,
  leaveAt: true,
  pricePerSeatCents: true,
  chatPreference: true,
  musicOk: true,
  smokingOk: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  phoneVisibility: true,
  notifyRideUpdates: true,
  notifyMessages: true,
  notifyNews: true,
  licenceState: true,
  licenceLast4: true,
  licenceExpiresOn: true,
  insuranceProvider: true,
  insurancePolicyLast4: true,
  insuranceExpiresOn: true,
  vehicle: {
    select: { make: true, model: true, year: true, color: true, plate: true, seats: true },
  },
} satisfies Prisma.UserSelect;

// Thrown by the field parsers; sent to the app as 400 { error, field }.
class FieldError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

// ---- Field parsers. Each returns the value to store or throws FieldError. ----

// Required text: trimmed, not empty, at most maxLength characters.
function requiredText(field: string, value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FieldError(field, `Enter your ${label}.`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new FieldError(field, `Keep it under ${maxLength} characters.`);
  }
  return text;
}

// Optional text: null or "" clears it.
function optionalText(field: string, value: unknown, maxLength: number): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new FieldError(field, "This must be text.");
  const text = value.trim();
  if (text.length === 0) return null;
  if (text.length > maxLength) {
    throw new FieldError(field, `Keep it under ${maxLength} characters.`);
  }
  return text;
}

// US phone numbers only. Stored as E.164 (+1 followed by 10 digits). null or "" clears it.
function optionalPhone(field: string, value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new FieldError(field, "This must be text.");
  if (value.trim().length === 0) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) {
    throw new FieldError(field, "Enter a 10-digit US phone number, like (312) 555-0123.");
  }
  return `+1${digits}`;
}

function optionalInt(field: string, value: unknown, min: number, max: number, message: string) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new FieldError(field, message);
  }
  return value;
}

function oneOf<T extends string>(field: string, value: unknown, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new FieldError(field, "Choose one of the options.");
  }
  return value as T;
}

function optionalOneOf<T extends string>(field: string, value: unknown, options: readonly T[]) {
  return value === null ? null : oneOf(field, value, options);
}

function bool(field: string, value: unknown): boolean {
  if (typeof value !== "boolean") throw new FieldError(field, "This must be on or off.");
  return value;
}

// 24-hour "HH:MM". null or "" clears it.
function optionalTime(field: string, value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new FieldError(field, "Enter a time like 8:30 AM.");
  }
  return value;
}

function weekdays(field: string, value: unknown) {
  if (!Array.isArray(value)) throw new FieldError(field, "Choose the days you travel.");
  const days = value.map((day) => oneOf(field, day, WEEKDAYS));
  // Remove duplicates and keep Monday-to-Sunday order.
  return WEEKDAYS.filter((day) => days.includes(day));
}

// Each profile field the app may change, with its parser. Fields not listed here
// (email, password, id, ...) can't be changed through PATCH /me.
const thisYear = new Date().getFullYear();
const PROFILE_FIELDS: Record<string, (value: unknown) => unknown> = {
  name: (v) => requiredText("name", v, "name", 80),
  phone: (v) => optionalPhone("phone", v),
  bio: (v) => optionalText("bio", v, 300),
  major: (v) => optionalText("major", v, 80),
  graduationYear: (v) =>
    optionalInt(
      "graduationYear",
      v,
      thisYear - 1,
      thisYear + 8,
      `Enter a year between ${thisYear - 1} and ${thisYear + 8}.`,
    ),
  rideRole: (v) => oneOf("rideRole", v, RIDE_ROLES),
  // Checked again against the role, licence and car in PATCH /me.
  activeMode: (v) => oneOf("activeMode", v, RIDE_MODES),
  campus: (v) => optionalOneOf("campus", v, CAMPUSES),
  homeArea: (v) => optionalText("homeArea", v, 80),
  rideDays: (v) => weekdays("rideDays", v),
  arriveBy: (v) => optionalTime("arriveBy", v),
  leaveAt: (v) => optionalTime("leaveAt", v),
  pricePerSeatCents: (v) =>
    optionalInt(
      "pricePerSeatCents",
      v,
      0,
      MAX_PRICE_PER_SEAT_CENTS,
      `Enter a price between $0 and $${MAX_PRICE_PER_SEAT_CENTS / 100}.`,
    ),
  chatPreference: (v) => oneOf("chatPreference", v, CHAT_PREFERENCES),
  musicOk: (v) => bool("musicOk", v),
  smokingOk: (v) => bool("smokingOk", v),
  emergencyContactName: (v) => optionalText("emergencyContactName", v, 80),
  emergencyContactPhone: (v) => optionalPhone("emergencyContactPhone", v),
  phoneVisibility: (v) => oneOf("phoneVisibility", v, PHONE_VISIBILITIES),
  notifyRideUpdates: (v) => bool("notifyRideUpdates", v),
  notifyMessages: (v) => bool("notifyMessages", v),
  notifyNews: (v) => bool("notifyNews", v),
};

function sendFieldError(res: Response, err: unknown): boolean {
  if (err instanceof FieldError) {
    res.status(400).json({ error: err.message, field: err.field });
    return true;
  }
  return false;
}

// ---- Dates for the licence and insurance ----

// Today's date in Chicago as "YYYY-MM-DD", so "expired" matches what students see.
function todayInChicago(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

// Database DATE columns come back as midnight UTC.
function toDateString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

// "YYYY-MM-DD" that isn't in the past and is at most maxYears ahead.
function futureDate(field: string, value: unknown, what: string, maxYears: number): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new FieldError(field, "Enter the expiration date, like 05/31/2028.");
  }
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects dates like 2028-02-31, which Date would roll over to March.
  if (Number.isNaN(date.getTime()) || toDateString(date) !== value) {
    throw new FieldError(field, "Enter a real date, like 05/31/2028.");
  }
  if (value < todayInChicago()) {
    throw new FieldError(field, `This ${what} has expired. Enter the date on your current one.`);
  }
  if (date.getUTCFullYear() > new Date().getUTCFullYear() + maxYears) {
    throw new FieldError(field, "Check the expiration date.");
  }
  return date;
}

// The last 4 letters or digits of a licence or policy number.
function last4(field: string, value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9]{4}$/.test(value.trim())) {
    throw new FieldError(field, "Enter the last 4 letters or digits.");
  }
  return value.trim().toUpperCase();
}

type ProfileRow = Prisma.UserGetPayload<{ select: typeof PROFILE_SELECT }>;

// What's missing before a student can drive. Insurance is recommended but not required.
function driverStatus(user: Pick<ProfileRow, "licenceLast4" | "licenceExpiresOn" | "vehicle">) {
  const missing: ("licence" | "licenceExpired" | "car")[] = [];
  const licenceExpiresOn = toDateString(user.licenceExpiresOn);
  if (!user.licenceLast4 || !licenceExpiresOn) missing.push("licence");
  else if (licenceExpiresOn < todayInChicago()) missing.push("licenceExpired");
  if (!user.vehicle) missing.push("car");
  return { ready: missing.length === 0, missing };
}

// The shape the app receives: licence and insurance grouped, the mode the
// student is actually in, and stats.
function toProfile(user: ProfileRow) {
  const {
    licenceState,
    licenceLast4,
    licenceExpiresOn,
    insuranceProvider,
    insurancePolicyLast4,
    insuranceExpiresOn,
    activeMode,
    ...rest
  } = user;
  const status = driverStatus(user);
  // RIDER always rides and DRIVER always drives. A RIDER_DRIVER who lost their
  // licence or car since switching is shown as riding.
  const mode =
    user.rideRole === "DRIVER"
      ? "DRIVING"
      : user.rideRole === "RIDER_DRIVER" && activeMode === "DRIVING" && status.ready
        ? "DRIVING"
        : "RIDING";
  return {
    ...rest,
    activeMode: mode,
    licence:
      licenceLast4 && licenceState
        ? { state: licenceState, last4: licenceLast4, expiresOn: toDateString(licenceExpiresOn) }
        : null,
    insurance: insuranceProvider
      ? {
          provider: insuranceProvider,
          policyLast4: insurancePolicyLast4,
          expiresOn: toDateString(insuranceExpiresOn),
        }
      : null,
    driverStatus: status,
    // Ratings and ride counts come from rides, which don't exist yet.
    stats: { ratingAverage: null, ratingCount: 0, ridesGiven: 0, ridesTaken: 0 },
  };
}

async function loadProfile(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  return user && toProfile(user);
}

const DRIVER_SETUP_MESSAGES: Record<string, string> = {
  licence: "Add your driver's licence to start driving.",
  licenceExpired: "Your driver's licence has expired. Update it to start driving.",
  car: "Add your car to start driving.",
};

// GET /me -> 200 { profile }
meRoutes.get("/", async (req: Request, res: Response) => {
  const profile = await loadProfile(currentUserId(res));
  res.json({ profile });
});

// PATCH /me  { any of PROFILE_FIELDS } -> 200 { profile }
// Only the fields sent are changed.
meRoutes.patch("/", async (req: Request, res: Response) => {
  const body = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ error: "Send the fields to change as a JSON object." });
    return;
  }

  const data: Record<string, unknown> = {};
  try {
    for (const [field, value] of Object.entries(body)) {
      const parse = PROFILE_FIELDS[field];
      if (!parse) {
        res.status(400).json({ error: `"${field}" can't be changed here.`, field });
        return;
      }
      data[field] = parse(value);
    }
  } catch (err) {
    if (sendFieldError(res, err)) return;
    throw err;
  }

  const userId = currentUserId(res);

  // Switching to driving needs the right role, a valid licence and a car.
  if (data.activeMode === "DRIVING") {
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    const role = (data.rideRole as string | undefined) ?? current.rideRole;
    if (role !== "RIDER_DRIVER" && role !== "DRIVER") {
      res.status(400).json({ error: "Choose Driver or Rider & Driver first.", field: "activeMode" });
      return;
    }
    const status = driverStatus(current);
    if (!status.ready) {
      res.status(400).json({
        error: DRIVER_SETUP_MESSAGES[status.missing[0]],
        field: "activeMode",
        missing: status.missing,
      });
      return;
    }
  } else if (data.rideRole !== undefined && data.activeMode === undefined) {
    // A new role starts in riding mode; a RIDER_DRIVER switches to driving on Home.
    data.activeMode = "RIDING";
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: data as Prisma.UserUpdateInput,
    select: PROFILE_SELECT,
  });
  res.json({ profile: toProfile(user) });
});

// POST /me/terms -> 200 { profile }
// Records that the student agreed to the Terms and Conditions. Keeps the first date.
meRoutes.post("/terms", async (req: Request, res: Response) => {
  const userId = currentUserId(res);
  await prisma.user.updateMany({
    where: { id: userId, termsAcceptedAt: null },
    data: { termsAcceptedAt: new Date() },
  });
  res.json({ profile: await loadProfile(userId) });
});

// PUT /me/vehicle  { make, model, year?, color, plate, seats } -> 200 { profile }
// Creates the car or replaces it.
meRoutes.put("/vehicle", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  let vehicle;
  try {
    const plate = requiredText("plate", body.plate, "licence plate", 10).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9 -]*$/.test(plate)) {
      throw new FieldError("plate", "Use only letters, numbers, spaces and dashes.");
    }
    vehicle = {
      make: requiredText("make", body.make, "car's make", 40),
      model: requiredText("model", body.model, "car's model", 40),
      year: optionalInt("year", body.year ?? null, 1990, thisYear + 1, "Enter the car's year."),
      color: requiredText("color", body.color, "car's colour", 30),
      plate,
      seats: optionalInt("seats", body.seats ?? null, 1, MAX_SEATS, "Offer 1 to 3 seats."),
    };
    if (vehicle.seats === null) throw new FieldError("seats", "Offer 1 to 3 seats.");
  } catch (err) {
    if (sendFieldError(res, err)) return;
    throw err;
  }

  const userId = currentUserId(res);
  const data = { ...vehicle, seats: vehicle.seats! };
  await prisma.vehicle.upsert({
    where: { userId },
    create: { ...data, userId },
    update: data,
  });
  res.json({ profile: await loadProfile(userId) });
});

// DELETE /me/vehicle -> 200 { profile }
meRoutes.delete("/vehicle", async (req: Request, res: Response) => {
  const userId = currentUserId(res);
  await prisma.$transaction([
    prisma.vehicle.deleteMany({ where: { userId } }),
    // Can't drive without a car.
    prisma.user.update({ where: { id: userId }, data: { activeMode: "RIDING" } }),
  ]);
  res.json({ profile: await loadProfile(userId) });
});

// PUT /me/licence  { state, last4, expiresOn: "YYYY-MM-DD" } -> 200 { profile }
// Only the last 4 characters of the licence number are sent and stored.
meRoutes.put("/licence", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  let data;
  try {
    const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
    if (!(US_STATES as readonly string[]).includes(state)) {
      throw new FieldError("state", "Choose the state that issued your licence.");
    }
    data = {
      licenceState: state,
      licenceLast4: last4("last4", body.last4),
      licenceExpiresOn: futureDate("expiresOn", body.expiresOn, "licence", 15),
    };
  } catch (err) {
    if (sendFieldError(res, err)) return;
    throw err;
  }
  const userId = currentUserId(res);
  await prisma.user.update({ where: { id: userId }, data });
  res.json({ profile: await loadProfile(userId) });
});

// DELETE /me/licence -> 200 { profile }
meRoutes.delete("/licence", async (req: Request, res: Response) => {
  const userId = currentUserId(res);
  await prisma.user.update({
    where: { id: userId },
    // Can't drive without a licence.
    data: { licenceState: null, licenceLast4: null, licenceExpiresOn: null, activeMode: "RIDING" },
  });
  res.json({ profile: await loadProfile(userId) });
});

// PUT /me/insurance  { provider, policyLast4?, expiresOn: "YYYY-MM-DD" } -> 200 { profile }
meRoutes.put("/insurance", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  let data;
  try {
    data = {
      insuranceProvider: requiredText("provider", body.provider, "insurance company", 60),
      insurancePolicyLast4:
        body.policyLast4 === undefined || body.policyLast4 === null || body.policyLast4 === ""
          ? null
          : last4("policyLast4", body.policyLast4),
      insuranceExpiresOn: futureDate("expiresOn", body.expiresOn, "policy", 2),
    };
  } catch (err) {
    if (sendFieldError(res, err)) return;
    throw err;
  }
  const userId = currentUserId(res);
  await prisma.user.update({ where: { id: userId }, data });
  res.json({ profile: await loadProfile(userId) });
});

// DELETE /me/insurance -> 200 { profile }
meRoutes.delete("/insurance", async (req: Request, res: Response) => {
  const userId = currentUserId(res);
  await prisma.user.update({
    where: { id: userId },
    data: { insuranceProvider: null, insurancePolicyLast4: null, insuranceExpiresOn: null },
  });
  res.json({ profile: await loadProfile(userId) });
});

// Checks the user's current password. Returns false for a wrong or missing one.
async function passwordMatches(userId: number, password: unknown) {
  if (typeof password !== "string" || password.length === 0) return false;
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return false;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });
  return bcrypt.compare(password, user.passwordHash);
}

// POST /me/password  { currentPassword, newPassword } -> 200 { token }
// Signs out every other device. The new token keeps this device signed in.
meRoutes.post("/password", async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const userId = currentUserId(res);

  if (!(await passwordMatches(userId, currentPassword))) {
    res.status(400).json({ error: "Your current password is incorrect.", field: "currentPassword" });
    return;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const passwordError = validateNewPassword(newPassword, [user.name, user.email]);
  if (passwordError) {
    res.status(400).json({ error: passwordError, field: "newPassword" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
    select: { id: true, tokenVersion: true },
  });
  res.json({ token: signToken(updated) });
});

// DELETE /me  { password } -> 204
// Deletes the account, its car and its reset codes. This can't be undone.
meRoutes.delete("/", async (req: Request, res: Response) => {
  const userId = currentUserId(res);
  if (!(await passwordMatches(userId, req.body?.password))) {
    res.status(400).json({ error: "Your password is incorrect.", field: "password" });
    return;
  }
  await prisma.user.delete({ where: { id: userId } });
  res.status(204).end();
});
