// Display helpers for profile values.

// "+13125550123" -> "(312) 555-0123". Anything else is returned unchanged.
export function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}

// "08:30" -> "8:30 AM", "17:15" -> "5:15 PM".
export function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// Reads what a student types into "HH:MM" (24-hour), or returns null if it isn't a time.
// Accepts "8:30 am", "8:30AM", "8am", "17:15", "0830".
export function parseTime(input: string): string | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, "");
  const match = /^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/.exec(text);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const suffix = match[3]?.[0];
  if (minutes > 59) return null;
  if (suffix) {
    if (hours < 1 || hours > 12) return null;
    if (suffix === "a" && hours === 12) hours = 0;
    if (suffix === "p" && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// 500 -> "$5", 550 -> "$5.50".
export function formatPrice(cents: number | null): string | null {
  if (cents === null) return null;
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// "5", "$5.50" -> cents, or null if it isn't an amount of money.
export function parsePrice(input: string): number | null {
  const text = input.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

// "Ana María López" -> "AL".
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// "Ana María López" -> "Ana".
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

// "05/31/2028" or "2028-05-31" -> "2028-05-31", or null if it isn't a real date.
export function parseDate(input: string): string | null {
  const text = input.trim();
  let year: number, month: number, day: number;
  const us = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (us) [month, day, year] = [Number(us[1]), Number(us[2]), Number(us[3])];
  else if (iso) [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

// "2028-05-31" -> "05/31/2028".
export function formatDate(date: string | null): string | null {
  if (!date) return null;
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
}

// A date on this device as "YYYY-MM-DD".
function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// "expired", "soon" (within 30 days) or "ok", for a "YYYY-MM-DD" expiration date.
export function expiryState(expiresOn: string): "expired" | "soon" | "ok" {
  const now = new Date();
  if (expiresOn < localDateString(now)) return "expired";
  const inThirtyDays = new Date(now);
  inThirtyDays.setDate(now.getDate() + 30);
  return expiresOn <= localDateString(inThirtyDays) ? "soon" : "ok";
}
