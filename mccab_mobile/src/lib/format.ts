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
