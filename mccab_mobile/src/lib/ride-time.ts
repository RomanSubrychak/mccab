// Ride dates and times are always Chicago time, whatever the phone's own time
// zone is (a student could be travelling). This uses the US daylight saving
// rules directly instead of Intl time zone support, which isn't complete on
// every phone.

const HOUR = 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The nth Sunday of a month (1-based), as a day of the month.
function nthSunday(year: number, month: number, n: number): number {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - firstWeekday) % 7) + (n - 1) * 7;
}

// Chicago's offset from UTC at a moment: -5 hours from the second Sunday of
// March (2 AM) to the first Sunday of November (2 AM), otherwise -6.
function chicagoOffsetMs(utcMs: number): number {
  const year = new Date(utcMs).getUTCFullYear();
  const dstStart = Date.UTC(year, 2, nthSunday(year, 2, 2), 8); // 2 AM CST
  const dstEnd = Date.UTC(year, 10, nthSunday(year, 10, 1), 7); // 2 AM CDT
  return utcMs >= dstStart && utcMs < dstEnd ? -5 * HOUR : -6 * HOUR;
}

// A moment's Chicago wall-clock time, read with the getUTC* methods.
function chicagoClock(moment: Date): Date {
  return new Date(moment.getTime() + chicagoOffsetMs(moment.getTime()));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKeyOf(clock: Date): string {
  return `${clock.getUTCFullYear()}-${pad(clock.getUTCMonth() + 1)}-${pad(clock.getUTCDate())}`;
}

// The Chicago date of a moment, as "YYYY-MM-DD".
export function chicagoDateKey(moment: Date = new Date()): string {
  return dateKeyOf(chicagoClock(moment));
}

// "2026-11-20" + "07:30" (Chicago) -> "2026-11-20T07:30:00-06:00", for the server.
export function toChicagoIso(dateKey: string, time: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hours, minutes);
  // The offset in effect at that wall-clock time (try standard time first).
  const offset = chicagoOffsetMs(wallClock + 6 * HOUR);
  const sign = offset < 0 ? "-" : "+";
  return `${dateKey}T${time}:00${sign}${pad(Math.abs(offset) / HOUR)}:00`;
}

// The UTC moment of a Chicago date and time.
export function chicagoMoment(dateKey: string, time: string): Date {
  return new Date(toChicagoIso(dateKey, time));
}

// The Chicago date `days` calendar days after today, as a UTC-midnight Date
// (read with getUTC*). Calendar steps, not 24-hour steps, so daylight saving
// nights can't skip or repeat a date.
function chicagoDayAfterToday(days: number): Date {
  const [year, month, day] = chicagoDateKey().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days));
}

function dayLabel(dateKey: string, clock: Date): string {
  if (dateKey === dateKeyOf(chicagoDayAfterToday(0))) return "Today";
  if (dateKey === dateKeyOf(chicagoDayAfterToday(1))) return "Tomorrow";
  return `${WEEKDAYS[clock.getUTCDay()]}, ${MONTHS[clock.getUTCMonth()]} ${clock.getUTCDate()}`;
}

function timeLabel(clock: Date): string {
  const hours = clock.getUTCHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(clock.getUTCMinutes())} ${hours < 12 ? "AM" : "PM"}`;
}

// "2026-11-18T13:30:00Z" -> "Tomorrow · 7:30 AM" or "Thu, Nov 20 · 7:30 AM" (Chicago time).
export function formatRideTime(iso: string): string {
  const clock = chicagoClock(new Date(iso));
  return `${dayLabel(dateKeyOf(clock), clock)} · ${timeLabel(clock)}`;
}

// The next `count` Chicago dates, starting today, for choosing a ride's day.
export function upcomingDays(count: number): { value: string; label: string }[] {
  return Array.from({ length: count }, (_, index) => {
    const clock = chicagoDayAfterToday(index);
    const key = dateKeyOf(clock);
    const label =
      index === 0
        ? "Today"
        : index === 1
          ? "Tomorrow"
          : `${WEEKDAYS[clock.getUTCDay()]} ${clock.getUTCDate()}`;
    return { value: key, label };
  });
}
