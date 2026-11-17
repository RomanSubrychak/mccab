import { createHmac, timingSafeEqual } from "node:crypto";

// Address search for the app, through Geoapify (OpenStreetMap data).
// The app never talks to Geoapify directly: the API key stays on the server,
// and only this file knows which provider is used.

// What the app shows in the suggestion list, and what PATCH /me stores.
export type Place = {
  // Full address, private to its owner. E.g. "1234 W 18th St, Chicago, IL 60608".
  address: string;
  // Neighbourhood or city only, safe to show other students. E.g. "Pilsen, Chicago".
  area: string;
  lat: number;
  lng: number;
};

export type Suggestion = {
  // Full address, as it will be saved.
  address: string;
  // What other students would see.
  area: string;
  // Shown in bold in the list (street and number, or the place's name).
  title: string;
  // Shown under the title (city, state, ZIP).
  subtitle: string;
  // Signed copy of the place. The app sends it back to PATCH /me, so the
  // server can trust the address and coordinates without looking them up again.
  token: string;
};

export class PlacesNotConfiguredError extends Error {}
export class PlacesUnavailableError extends Error {}

const AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";
// Geoapify's free plan often takes 2 to 7 seconds to answer.
const TIMEOUT_MS = 10_000;
const MAX_RESULTS = 5;
// Downtown Chicago, as "lon,lat" (Geoapify's order).
const CHICAGO = "-87.6298,41.8781";
// Searched first: 80 km around downtown covers every campus, the suburbs and
// NW Indiana. A bias alone isn't enough: "1234 W 18th St" then finds that
// address in Florida and Texas before Chicago.
const CHICAGO_AREA = `circle:${CHICAGO},80000`;
// Used only when the Chicago area has no results at all. If it only has vague
// ones (a neighbourhood, a ZIP), searching the whole US wouldn't help.
const ANYWHERE_IN_US = "countrycode:us";
// Precise enough for a home address. Areas (suburb, city, ZIP, ...) are not.
const PRECISE_TYPES = new Set(["building", "amenity", "street"]);
// How long a suggestion's token can be saved after the search.
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
// Recent searches, so retyping the same text is instant and doesn't use quota.
const CACHE_LIFETIME_MS = 10 * 60 * 1000;
const CACHE_SIZE = 500;

// The fields of a Geoapify result that are used here.
type GeoapifyResult = {
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  lat?: number;
  lon?: number;
  result_type?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state_code?: string;
};

// A suggestion before it's signed. Tokens expire, so the cache keeps these.
type Match = Place & { title: string; subtitle: string };

const cache = new Map<string, { matches: Match[]; at: number }>();

// Suggestions for what the student typed. Only precise US addresses are kept,
// from the Chicago area if there are any there.
export async function searchAddresses(text: string): Promise<Suggestion[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new PlacesNotConfiguredError("GEOAPIFY_API_KEY is not set.");

  const key = text.toLowerCase().replace(/\s+/g, " ");
  let matches = cached(key);
  if (!matches) {
    const nearby = await fetchMatches(text, CHICAGO_AREA, apiKey);
    matches =
      nearby.found > 0
        ? nearby.matches
        : (await fetchMatches(text, ANYWHERE_IN_US, apiKey)).matches;
    remember(key, matches);
  }
  // The app doesn't need the coordinates, so they're only inside the token
  // (signed, not encrypted: readable, but they can't be changed).
  return matches.map(({ address, area, title, subtitle, lat, lng }) => ({
    address,
    area,
    title,
    subtitle,
    token: signPlace({ address, area, lat, lng }),
  }));
}

function cached(key: string): Match[] | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.at > CACHE_LIFETIME_MS) return null;
  return entry.matches;
}

function remember(key: string, matches: Match[]) {
  // A Map keeps insertion order, so the first key is the oldest.
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
  cache.set(key, { matches, at: Date.now() });
}

// The precise addresses Geoapify found, and how many results it had in all.
async function fetchMatches(
  text: string,
  filter: string,
  apiKey: string,
): Promise<{ matches: Match[]; found: number }> {
  const params = new URLSearchParams({
    text,
    filter,
    bias: `proximity:${CHICAGO}`,
    lang: "en",
    limit: String(MAX_RESULTS + 3), // Some are dropped below for being too vague.
    format: "json",
    apiKey,
  });

  let response: Response;
  try {
    response = await fetch(`${AUTOCOMPLETE_URL}?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Never log the URL: it contains the API key and what the student typed.
    throw new PlacesUnavailableError(`Geoapify request failed: ${(err as Error).name}`);
  }
  if (!response.ok) {
    throw new PlacesUnavailableError(`Geoapify answered ${response.status}.`);
  }

  const data = (await response.json().catch(() => null)) as { results?: GeoapifyResult[] } | null;
  const results = data?.results ?? [];
  const matches: Match[] = [];
  for (const result of results) {
    const place = toPlace(result);
    if (!place) continue;
    // The same address can come back twice (e.g. a building and its entrance).
    if (matches.some((match) => match.address === place.address)) continue;
    matches.push({
      ...place,
      title: result.address_line1 || place.address,
      subtitle: withoutCountry(result.address_line2 ?? ""),
    });
    if (matches.length === MAX_RESULTS) break;
  }
  return { matches, found: results.length };
}

function toPlace(result: GeoapifyResult): Place | null {
  const { formatted, lat, lon, result_type } = result;
  if (!formatted || typeof lat !== "number" || typeof lon !== "number") return null;
  if (!result_type || !PRECISE_TYPES.has(result_type)) return null;
  const area = areaLabel(result);
  if (!area) return null;
  return { address: withoutCountry(formatted), area, lat, lng: lon };
}

// Every result is in the US, so the country only takes up space.
function withoutCountry(text: string): string {
  return text.replace(/,\s*United States( of America)?$/, "");
}

// The public part of an address: neighbourhood and city, never the street.
function areaLabel(result: GeoapifyResult): string | null {
  const { suburb, city, county, state_code } = result;
  if (suburb && city && suburb !== city) return `${suburb}, ${city}`;
  if (city) return city;
  if (suburb) return suburb;
  if (county && state_code) return `${county}, ${state_code}`;
  return null;
}

// ---- Signed places ----
// A token is "<payload>.<signature>": the place and an expiry, signed with
// JWT_SECRET so the app can't change the address, area or coordinates.

function signature(payload: string): Buffer {
  return createHmac("sha256", `places:${process.env.JWT_SECRET}`).update(payload).digest();
}

function signPlace(place: Place): string {
  const payload = Buffer.from(
    JSON.stringify({ ...place, exp: Date.now() + TOKEN_LIFETIME_MS }),
  ).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

// The place inside a token from searchAddresses, or null if the token was
// changed, has expired, or isn't one.
export function verifyPlaceToken(token: unknown): Place | null {
  if (typeof token !== "string" || token.length > 2000) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;

  const expected = signature(payload);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    const { address, area, lat, lng } = data;
    if (typeof address !== "string" || typeof area !== "string") return null;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { address, area, lat, lng };
  } catch {
    return null;
  }
}
