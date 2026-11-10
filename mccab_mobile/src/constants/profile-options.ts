// Choices on the profile page. The values match the enums in
// server/prisma/schema.prisma; keep both in sync.

export type RideRole = "RIDER" | "RIDER_DRIVER";
export type Campus = "CHICAGO_MAIN" | "CHICAGO_DOWNTOWN" | "NAPERVILLE" | "EVERGREEN_PARK";
export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type ChatPreference = "QUIET" | "SOME" | "CHATTY";
export type PhoneVisibility = "CONFIRMED_RIDES" | "NOBODY";

// Every student can ride. "Rider & Driver" can also offer rides in their own car.
export const RIDE_ROLES: { value: RideRole; label: string; emoji: string; description: string }[] = [
  {
    value: "RIDER",
    label: "Rider",
    emoji: "🎒",
    description: "Find a seat with a classmate who's already driving to campus.",
  },
  {
    value: "RIDER_DRIVER",
    label: "Rider & Driver",
    emoji: "🚗",
    description: "Book seats when you need one, and offer rides in your own car to 2 or 3 students.",
  },
];

export function rideRoleLabel(role: RideRole | null): string | null {
  return RIDE_ROLES.find((option) => option.value === role)?.label ?? null;
}

export function isDriver(role: RideRole | null): boolean {
  return role === "RIDER_DRIVER";
}

// MCC campuses in the Chicago area (https://www.mccollege.edu/locations).
export const CAMPUSES: { value: Campus; label: string; address: string }[] = [
  {
    value: "CHICAGO_MAIN",
    label: "Chicago Main",
    address: "203 N LaSalle St #1400, Chicago, IL 60601",
  },
  {
    value: "CHICAGO_DOWNTOWN",
    label: "Chicago Downtown",
    address: "100 S Wacker Dr LL1-50, Chicago, IL 60606",
  },
  {
    value: "NAPERVILLE",
    label: "Naperville",
    address: "200 E 5th Ave #128, Naperville, IL 60563",
  },
  {
    value: "EVERGREEN_PARK",
    label: "Evergreen Park",
    address: "9730 S Western Ave, Evergreen Park, IL 60805",
  },
];

export function campusLabel(campus: Campus | null): string | null {
  return CAMPUSES.find((option) => option.value === campus)?.label ?? null;
}

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

export const CHAT_PREFERENCES: { value: ChatPreference; label: string }[] = [
  { value: "QUIET", label: "Quiet ride" },
  { value: "SOME", label: "A little chat" },
  { value: "CHATTY", label: "Chatty" },
];

export const PHONE_VISIBILITIES: { value: PhoneVisibility; label: string }[] = [
  { value: "CONFIRMED_RIDES", label: "People in my confirmed rides" },
  { value: "NOBODY", label: "Nobody" },
];

// Same limits as the server (server/src/routes/me.ts).
export const MAX_SEATS = 3;
export const MAX_PRICE_PER_SEAT_DOLLARS = 25;
