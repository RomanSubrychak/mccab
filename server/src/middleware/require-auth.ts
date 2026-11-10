import { NextFunction, Request, Response } from "express";

import { verifyToken } from "../lib/auth-token";
import { prisma } from "../lib/prisma";

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

// Lets the request through only with a valid "Authorization: Bearer <token>"
// header for a user who still exists and hasn't changed their password since
// the token was made. Sets res.locals.userId for the route.
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
    select: { id: true, tokenVersion: true },
  });
  if (!user || user.tokenVersion !== claims.tokenVersion) {
    res.status(401).json({ error: SESSION_EXPIRED });
    return;
  }

  res.locals.userId = user.id;
  next();
}

// The user id set by requireAuth.
export function currentUserId(res: Response): number {
  return res.locals.userId as number;
}
