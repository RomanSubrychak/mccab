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

const RIDE_ROLES = ["RIDER", "RIDER_DRIVER"] as const;
const CAMPUSES = ["CHICAGO_MAIN", "CHICAGO_DOWNTOWN", "NAPERVILLE", "EVERGREEN_PARK"] as const;
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const CHAT_PREFERENCES = ["QUIET", "SOME", "CHATTY"] as const;
const PHONE_VISIBILITIES = ["CONFIRMED_RIDES", "NOBODY"] as const;

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

async function loadProfile(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  return user && withStats(user);
}

// Ratings and ride counts come from rides, which don't exist yet.
function withStats<T>(user: T) {
  return {
    ...user,
    stats: { ratingAverage: null, ratingCount: 0, ridesGiven: 0, ridesTaken: 0 },
  };
}

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

  const user = await prisma.user.update({
    where: { id: currentUserId(res) },
    data: data as Prisma.UserUpdateInput,
    select: PROFILE_SELECT,
  });
  res.json({ profile: withStats(user) });
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
  await prisma.vehicle.deleteMany({ where: { userId } });
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
