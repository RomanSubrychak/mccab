import type { Href } from "expo-router";

import { isDriver } from "@/constants/profile-options";
import type { Profile } from "@/lib/api";

export type ChecklistItem = { label: string; href: Href };

// What's still missing before others can ride with this student.
// Drivers also need a car and a price.
export function missingProfileItems(profile: Profile): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  if (!profile.phone) items.push({ label: "Add your phone number", href: "/settings/about" });
  if (!profile.campus) items.push({ label: "Choose your campus", href: "/settings/route" });
  if (!profile.homeArea) items.push({ label: "Add your home area", href: "/settings/route" });
  if (isDriver(profile.rideRole)) {
    if (!profile.vehicle) items.push({ label: "Add your car", href: "/settings/car" });
    if (profile.pricePerSeatCents === null) {
      items.push({ label: "Set your price per seat", href: "/settings/preferences" });
    }
  }
  if (!profile.emergencyContactName || !profile.emergencyContactPhone) {
    items.push({ label: "Add an emergency contact", href: "/settings/safety" });
  }
  return items;
}
