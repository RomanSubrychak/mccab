import { campusLabel, type Campus } from "@/constants/profile-options";
import type { BookingStatus, Ride, RideDirection } from "@/lib/api";

export const RIDE_DIRECTIONS: { value: RideDirection; label: string }[] = [
  { value: "TO_CAMPUS", label: "To campus" },
  { value: "FROM_CAMPUS", label: "From campus" },
];

// "To Chicago Main" or "From Naperville".
export function routeLabel(direction: RideDirection, campus: Campus): string {
  return `${direction === "TO_CAMPUS" ? "To" : "From"} ${campusLabel(campus)}`;
}

// "Pilsen, Chicago → Chicago Main", in the direction of travel.
export function tripLabel(ride: Pick<Ride, "direction" | "campus" | "startArea">): string {
  const campus = campusLabel(ride.campus);
  return ride.direction === "TO_CAMPUS"
    ? `${ride.startArea} → ${campus}`
    : `${campus} → ${ride.startArea}`;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  REQUESTED: "Waiting for the driver",
  ACCEPTED: "Seat confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

// Shown wherever a price appears: the app doesn't handle payments.
export const PAYMENT_NOTE = "Pay the driver directly (cash, Zelle, Venmo).";
