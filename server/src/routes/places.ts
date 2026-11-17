import { Request, Response, Router } from "express";

import { PlacesNotConfiguredError, searchAddresses } from "../lib/places";
import { currentUserId, requireAuth } from "../middleware/require-auth";

// Address search for signed-in students (see lib/places.ts).
export const placesRoutes = Router();
placesRoutes.use(requireAuth);

const MIN_LENGTH = 3;
const MAX_LENGTH = 200;

// Each student gets at most this many searches per minute, so one account
// can't use up the provider's daily free quota (3,000 requests).
const SEARCHES_PER_MINUTE = 30;
const recentSearches = new Map<number, number[]>();

function tooManySearches(userId: number): boolean {
  const now = Date.now();
  const times = (recentSearches.get(userId) ?? []).filter((time) => now - time < 60_000);
  const limited = times.length >= SEARCHES_PER_MINUTE;
  if (!limited) times.push(now);
  recentSearches.set(userId, times);
  return limited;
}

// GET /places/autocomplete?text=... -> 200 { suggestions }
// Up to 5 precise US addresses, nearest to Chicago first. Text shorter than
// 3 characters gets an empty list without asking the provider.
placesRoutes.get("/autocomplete", async (req: Request, res: Response) => {
  const text = typeof req.query.text === "string" ? req.query.text.trim() : "";
  if (text.length < MIN_LENGTH) {
    res.json({ suggestions: [] });
    return;
  }
  if (text.length > MAX_LENGTH) {
    res.status(400).json({ error: "That address is too long." });
    return;
  }
  if (tooManySearches(currentUserId(res))) {
    res.status(429).json({ error: "Too many searches. Wait a minute and try again." });
    return;
  }

  try {
    res.json({ suggestions: await searchAddresses(text) });
  } catch (err) {
    if (err instanceof PlacesNotConfiguredError) {
      console.warn("Address search is off: GEOAPIFY_API_KEY is not set in server/.env.");
      res.status(503).json({ error: "Address search isn't set up on the server yet." });
      return;
    }
    console.error("Address search failed:", (err as Error).message);
    res.status(502).json({ error: "Address search isn't working right now. Try again." });
  }
});
