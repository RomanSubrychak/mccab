// Dates for students in Chicago. The database stores UTC; whatever a student
// calls "today" or "Tuesday" is worked out in Chicago time.

const CHICAGO = "America/Chicago";

// Today's date in Chicago as "YYYY-MM-DD", so "expired" matches what students see.
export function todayInChicago(): string {
  return chicagoDate(new Date());
}

// The Chicago date of a moment, as "YYYY-MM-DD".
export function chicagoDate(moment: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CHICAGO }).format(moment);
}

// Database DATE columns come back as midnight UTC.
export function toDateString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

// The UTC moments where a Chicago date ("YYYY-MM-DD") starts and the next one
// starts, for "departs on this day" queries. Handles daylight saving time.
export function chicagoDayRange(date: string): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number);
  return {
    start: chicagoMidnight(year, month, day),
    end: chicagoMidnight(year, month, day + 1),
  };
}

// Midnight in Chicago on a date, as a UTC moment. Date.UTC rolls day 32 over
// into the next month.
function chicagoMidnight(year: number, month: number, day: number): Date {
  const utcMidnight = Date.UTC(year, month - 1, day);
  return new Date(utcMidnight - chicagoOffsetMs(new Date(utcMidnight)));
}

// How far Chicago is from UTC at a moment, e.g. -6 hours in winter.
function chicagoOffsetMs(moment: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: CHICAGO, timeZoneName: "shortOffset" })
    .formatToParts(moment)
    .find((part) => part.type === "timeZoneName")!.value; // e.g. "GMT-6"
  const [, sign, hours, minutes] = name.match(/GMT([+-])(\d+)(?::(\d+))?/)!;
  const ms = (Number(hours) * 60 + Number(minutes ?? 0)) * 60_000;
  return sign === "-" ? -ms : ms;
}
