import { NextFunction, Request, Response } from "express";

import { verifyToken } from "../lib/auth-token";
import { prisma } from "../lib/prisma";

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

// Lets the request through only with a valid "Authorization: Bearer <token>"
// header for a user who still exists, has verified their email, and hasn't
// changed their password since the token was made. Sets res.locals.userId for the route.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.get("Authorization") ?? "";
  const [scheme, token] = header.split(" ");
  const claims = scheme === "Bearer" && token ? verifyToken(token) : null;
  if (!claims) {
    res.status(401).json({ error: SESSION_EXPIRED });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, tokenVersion: true, emailVerifiedAt: true },
  });
  if (!user || user.tokenVersion !== claims.tokenVersion) {
    res.status(401).json({ error: SESSION_EXPIRED });
    return;
  }
  // Login only gives tokens to verified accounts, but tokens made before email
  // verification existed are still around. 401 makes the app sign out; signing
  // in again then opens the verify email screen.
  if (!user.emailVerifiedAt) {
    res.status(401).json({
      error: "Verify your email before signing in.",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }

  res.locals.userId = user.id;
  next();
}

// The user id set by requireAuth.
export function currentUserId(res: Response): number {
  return res.locals.userId as number;
}
