import "dotenv/config";
import { randomInt } from "node:crypto";

import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Prisma } from "../generated/prisma/client";
import { sendVerificationEmail } from "../lib/email";
import { getPasswordProblem } from "../lib/password-strength";
import { prisma } from "../lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything after 72 bytes, so longer passwords are rejected.
const MAX_PASSWORD_BYTES = 72;
const BCRYPT_ROUNDS = 10;
const TOKEN_LIFETIME = "7d";
const CODE_LIFETIME_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
// A 6-digit code is guessable without a limit. A new code resets the count.
const MAX_CODE_ATTEMPTS = 5;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Add it to server/.env (see .env.example).");
}

// For example "school.edu". When empty, any email address can sign up.
const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
if (!ALLOWED_EMAIL_DOMAIN) {
  console.warn("ALLOWED_EMAIL_DOMAIN is not set: sign up is open to any email address.");
}

export const authRoutes = Router();

// Returns a message describing the first problem, or null when the input is valid.
function validateRegistration(name: unknown, email: unknown, password: unknown): string | null {
  if (typeof name !== "string" || name.trim().length === 0) {
    return "Enter your name.";
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return "Enter a valid email address.";
  }
  const domain = email.trim().toLowerCase().split("@")[1];
  if (ALLOWED_EMAIL_DOMAIN && domain !== ALLOWED_EMAIL_DOMAIN) {
    return `Use your school email address (@${ALLOWED_EMAIL_DOMAIN}).`;
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} characters.`;
  }
  // Runs last: the length checks above keep very long input away from it.
  return getPasswordProblem(password, [name, email]);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET!, { expiresIn: TOKEN_LIFETIME });
}

// Makes a new 6-digit code and the User columns that store it.
// Saving these replaces any earlier code, so only the newest one works.
async function createVerificationCode() {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  return {
    code,
    columns: {
      verificationCodeHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
      verificationCodeExpiresAt: new Date(now + CODE_LIFETIME_MINUTES * 60_000),
      verificationCodeSentAt: new Date(now),
      verificationAttempts: 0,
    },
  };
}

// Returns false instead of throwing, because the account is already saved by
// now and the user can still ask for a new code.
async function trySendCode(email: string, code: string): Promise<boolean> {
  try {
    await sendVerificationEmail(email, code, CODE_LIFETIME_MINUTES);
    return true;
  } catch (err) {
    console.error("Could not send verification email:", err);
    return false;
  }
}

// POST /auth/register  { name, email, password } -> 201 { user, emailSent }
// No token here: the account stays inactive until POST /auth/verify-email.
authRoutes.post("/register", async (req: Request, res: Response) => {
  // req.body is undefined when the request has no JSON body.
  const { name, email, password } = req.body ?? {};

  const validationError = validateRegistration(name, email, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { code, columns } = await createVerificationCode();

  try {
    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalizeEmail(email), passwordHash, ...columns },
      // Never send passwordHash back to the app.
      select: { id: true, email: true, name: true },
    });
    const emailSent = await trySendCode(user.email, code);
    res.status(201).json({ user, emailSent });
  } catch (err) {
    // P2002 = unique constraint failed. Relying on the database here means two
    // requests at the same moment can't both create the same email.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    throw err;
  }
});

// POST /auth/verify-email  { email, code } -> 200 { token, user }
authRoutes.post("/verify-email", async (req: Request, res: Response) => {
  const { email, code } = req.body ?? {};
  // Same message for a wrong code and an unknown or already verified email,
  // so this endpoint can't be used to find out who has an account.
  const incorrect = { error: "That code is incorrect. Check it and try again." };

  if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    res.status(400).json(incorrect);
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (
    !user ||
    user.emailVerifiedAt ||
    !user.verificationCodeHash ||
    !user.verificationCodeExpiresAt
  ) {
    res.status(400).json(incorrect);
    return;
  }

  // Count the attempt in the database first, so guesses sent at the same
  // moment can't get past the limit.
  const attempt = await prisma.user.updateMany({
    where: { id: user.id, verificationAttempts: { lt: MAX_CODE_ATTEMPTS } },
    data: { verificationAttempts: { increment: 1 } },
  });
  if (attempt.count === 0) {
    res.status(429).json({ error: "Too many attempts. Request a new code." });
    return;
  }

  if (!(await bcrypt.compare(code.trim(), user.verificationCodeHash))) {
    res.status(400).json(incorrect);
    return;
  }
  if (user.verificationCodeExpiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "This code has expired. Request a new one." });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      verificationCodeHash: null,
      verificationCodeExpiresAt: null,
      verificationCodeSentAt: null,
      verificationAttempts: 0,
    },
  });
  res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// POST /auth/resend-verification  { email } -> 200 { ok: true }
authRoutes.post("/resend-verification", async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string") {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  const normalizedEmail = normalizeEmail(email);

  // Unknown and already verified emails get the same answer as a real resend.
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.emailVerifiedAt) {
    res.json({ ok: true });
    return;
  }

  const { code, columns } = await createVerificationCode();
  // The cooldown is part of the update, so repeated taps can't send a burst of emails.
  const cooldownStart = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
  const saved = await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [{ verificationCodeSentAt: null }, { verificationCodeSentAt: { lte: cooldownStart } }],
    },
    data: columns,
  });
  if (saved.count === 0) {
    res.status(429).json({ error: "A code was sent recently. Wait a minute and try again." });
    return;
  }

  if (!(await trySendCode(normalizedEmail, code))) {
    res.status(502).json({ error: "We couldn't send the email. Wait a minute and try again." });
    return;
  }
  res.json({ ok: true });
});

// Compared against when the email has no account, so a wrong email takes as long
// as a wrong password and response time doesn't reveal which emails are registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

// POST /auth/login  { email, password } -> 200 { token, user }
authRoutes.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ error: "Enter your email address." });
    return;
  }
  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Enter your password." });
    return;
  }
  // Same limit as sign-up: no account can have a longer password.
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, email: true, name: true, passwordHash: true, emailVerifiedAt: true },
  });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) {
    // One message for both cases, so the app can't be used to check which emails exist.
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  // Checked after the password, so only the account owner learns this.
  if (!user.emailVerifiedAt) {
    res.status(403).json({
      error: "Verify your email before signing in.",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }

  res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, name: user.name },
  });
});
