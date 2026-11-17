import { toDateString, todayInChicago } from "./dates";

export const MAX_PRICE_PER_SEAT_CENTS = 2500; // $25
export const MAX_SEATS = 3;

// Shown when a student who can't drive yet tries to (switch to driving, post a ride).
export const DRIVER_SETUP_MESSAGES: Record<string, string> = {
  licence: "Add your driver's licence to start driving.",
  licenceExpired: "Your driver's licence has expired. Update it to start driving.",
  car: "Add your car to start driving.",
};

type DriverFields = {
  licenceLast4: string | null;
  licenceExpiresOn: Date | null;
  vehicle: unknown;
};

// What's missing before a student can drive. Insurance is recommended but not required.
export function driverStatus(user: DriverFields) {
  const missing: ("licence" | "licenceExpired" | "car")[] = [];
  const licenceExpiresOn = toDateString(user.licenceExpiresOn);
  if (!user.licenceLast4 || !licenceExpiresOn) missing.push("licence");
  else if (licenceExpiresOn < todayInChicago()) missing.push("licenceExpired");
  if (!user.vehicle) missing.push("car");
  return { ready: missing.length === 0, missing };
}
