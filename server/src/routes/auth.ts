import "dotenv/config";
import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Prisma } from "../generated/prisma/client";
import { getPasswordProblem } from "../lib/password-strength";
import { prisma } from "../lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything after 72 bytes, so longer passwords are rejected.
const MAX_PASSWORD_BYTES = 72;
const BCRYPT_ROUNDS = 10;
const TOKEN_LIFETIME = "7d";

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
      select: { id: true, email: true, name: true },
    });
    const token = jwt.sign({ sub: String(user.id) }, JWT_SECRET, {
      expiresIn: TOKEN_LIFETIME,
    });
    res.status(201).json({ token, user });
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
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) {
    // One message for both cases, so the app can't be used to check which emails exist.
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  const token = jwt.sign({ sub: String(user.id) }, JWT_SECRET, {
    expiresIn: TOKEN_LIFETIME,
  });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
