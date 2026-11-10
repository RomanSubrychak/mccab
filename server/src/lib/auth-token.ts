import "dotenv/config";
import jwt from "jsonwebtoken";

const TOKEN_LIFETIME = "7d";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Add it to server/.env (see .env.example).");
}

type TokenUser = { id: number; tokenVersion: number };

// The token carries the user's id and their tokenVersion at the time it was made.
// requireAuth rejects tokens whose version is older than the user's current one.
export function signToken(user: TokenUser): string {
  return jwt.sign({ sub: String(user.id), ver: user.tokenVersion }, JWT_SECRET!, {
    expiresIn: TOKEN_LIFETIME,
  });
}

// Returns null when the token is missing, malformed, expired or signed with another secret.
export function verifyToken(token: string): TokenUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET!);
    if (typeof payload !== "object" || typeof payload.sub !== "string") return null;
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    // Tokens made before tokenVersion existed have no "ver"; treat them as version 0.
    const tokenVersion = typeof payload.ver === "number" ? payload.ver : 0;
    return { id, tokenVersion };
  } catch {
    return null;
  }
}
