import type { Href } from "expo-router";

import { DRIVER_SETUP_ITEMS, isDriver } from "@/constants/profile-options";
import type { Profile } from "@/lib/api";
import { expiryState } from "@/lib/format";

export type ChecklistItem = { label: string; href: Href };

// What drivers must add before they can drive: a valid licence and a car.
// Comes from the server, which enforces it when switching to driving.
export function driverSetupItems(profile: Profile): ChecklistItem[] {
  if (!isDriver(profile.rideRole)) return [];
  return profile.driverStatus.missing.map((item) => DRIVER_SETUP_ITEMS[item]);
}

// Everything else that's still missing before others can ride with this student.
export function missingProfileItems(profile: Profile): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  if (!profile.phone) items.push({ label: "Add your phone number", href: "/settings/about" });
  if (!profile.campus) items.push({ label: "Choose your campus", href: "/settings/route" });
  if (!profile.homeArea) items.push({ label: "Add your home area", href: "/settings/route" });
  if (isDriver(profile.rideRole)) {
    if (!profile.insurance) {
      items.push({ label: "Add your insurance", href: "/settings/insurance" });
    } else if (expiryState(profile.insurance.expiresOn) === "expired") {
      items.push({ label: "Your insurance has expired: update it", href: "/settings/insurance" });
    }
    if (profile.pricePerSeatCents === null) {
      items.push({ label: "Set your price per seat", href: "/settings/preferences" });
    }
  }
  if (!profile.emergencyContactName || !profile.emergencyContactPhone) {
    items.push({ label: "Add an emergency contact", href: "/settings/safety" });
  }
  return items;
}
