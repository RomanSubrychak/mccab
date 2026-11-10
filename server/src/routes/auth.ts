import "dotenv/config";
import { createHash, randomBytes } from "crypto";
import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";

import { Prisma } from "../generated/prisma/client";
import { signToken } from "../lib/auth-token";
import { BCRYPT_ROUNDS, MAX_PASSWORD_BYTES, validateNewPassword } from "../lib/password-strength";
import { prisma } from "../lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_BYTES = 32;
const RESET_LIFETIME_MS = 15 * 60 * 1000;

// Only emails at exactly this domain can sign up (no subdomains). Login and
// password reset are not limited. Defaults to mccollege.edu when the variable is
// missing or empty, so a forgotten setting can't open sign-up to everyone.
// Set it to "*" to allow any email, for local testing only.
const DEFAULT_EMAIL_DOMAIN = "mccollege.edu";
const configuredDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
const ALLOWED_EMAIL_DOMAIN =
  configuredDomain === "*" ? null : configuredDomain || DEFAULT_EMAIL_DOMAIN;
if (!ALLOWED_EMAIL_DOMAIN) {
  console.warn('ALLOWED_EMAIL_DOMAIN is "*": sign up is open to any email address.');
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
    // Doesn't name the allowed domain on purpose.
    return "Use your school email address.";
  }
  return validateNewPassword(password, [name.trim(), email.trim()]);
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// POST /auth/register  { name, email, password } -> 201 { token, user }
authRoutes.post("/register", async (req: Request, res: Response) => {
  // req.body is undefined when the request has no JSON body.
  const { name, email, password } = req.body ?? {};

  const validationError = validateRegistration(name, email, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash },
      // Never send passwordHash back to the app.
      select: { id: true, email: true, name: true, tokenVersion: true },
    });
    res.status(201).json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name },
    });
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

// Creates a reset code when the email has an account. Does nothing otherwise.
async function createPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) return;

  const token = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_LIFETIME_MS);
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt },
    }),
  ]);
  console.log(
    `Password reset for ${user.email}: ${token} mccabmobile://reset-password?token=${token}`,
  );
}

// POST /auth/forgot-password  { email } -> 200 { ok: true }
// Always the same response when the email is well formed, so addresses can't be probed.
authRoutes.post("/forgot-password", (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  // Respond before looking up the account. Only real accounts get a code, so
  // waiting for that work would make their responses measurably slower.
  res.json({ ok: true });

  createPasswordReset(email).catch((err) => {
    console.error("Failed to create password reset:", err);
  });
});

// POST /auth/reset-password  { token, password } -> 200 { ok: true }
authRoutes.post("/reset-password", async (req: Request, res: Response) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const password = req.body?.password;

  if (token.length === 0) {
    res.status(400).json({ error: "Enter the reset code." });
    return;
  }

  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
    res.status(400).json({ error: "This reset code is invalid or has expired." });
    return;
  }

  const passwordError = validateNewPassword(password, [reset.user.name, reset.user.email]);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const updated = await prisma.$transaction(async (tx) => {
    // Claim the code and check it in one statement. Two requests with the same
    // code can both pass the check above; the database lets only one of them
    // change usedAt, and the other gets count 0.
    const { count } = await tx.passwordReset.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (count === 0) return false;
    // Bumping tokenVersion signs out every device that was logged in before the reset.
    await tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    return true;
  });
  if (!updated) {
    res.status(400).json({ error: "This reset code is invalid or has expired." });
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
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, name: true, passwordHash: true, tokenVersion: true },
  });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) {
    // One message for both cases, so the app can't be used to check which emails exist.
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name } });
});
