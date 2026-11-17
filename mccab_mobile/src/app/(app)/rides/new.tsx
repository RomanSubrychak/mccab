import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { ChoiceChips } from "@/components/settings";
import { InfoCard } from "@/components/tab-screen";
import { TextField } from "@/components/text-field";
import {
  CAMPUSES,
  MAX_PRICE_PER_SEAT_DOLLARS,
  isDriver,
  type Campus,
} from "@/constants/profile-options";
import { PAYMENT_NOTE, RIDE_DIRECTIONS } from "@/constants/ride-options";
import { useBackFallback } from "@/components/back-fallback";
import { useThemeColors, type Colors } from "@/constants/theme";
import { postRide, type Profile, type RideDirection } from "@/lib/api";
import { formatPrice, parsePrice, parseTime } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { chicagoMoment, toChicagoIso, upcomingDays } from "@/lib/ride-time";

// The server allows rides up to 30 days ahead; two weeks of chips covers the usual plans.
const DAYS_SHOWN = 14;
const FIELDS = [
  "direction",
  "campus",
  "date",
  "departAt",
  "seats",
  "pricePerSeatCents",
  "notes",
] as const;
type Field = (typeof FIELDS)[number];

export default function NewRideScreen() {
  useBackFallback("/rides");
  return <WithProfile>{(profile) => <NewRide profile={profile} />}</WithProfile>;
}

function NewRide({ profile }: { profile: Profile }) {
  const missing = whatsMissing(profile);
  if (missing) return <NotReady {...missing} />;
  return <NewRideForm profile={profile} />;
}

// Offering a ride needs the driver role, a valid licence, a car and a home address.
function whatsMissing(
  profile: Profile,
): { message: string; href: Parameters<typeof router.push>[0]; action: string } | null {
  if (!isDriver(profile.rideRole)) {
    return {
      message: "Switch to Driver or Rider & Driver to offer rides.",
      href: "/profile",
      action: "Go to Profile",
    };
  }
  const setup = profile.driverStatus.missing[0];
  if (setup === "car")
    return { message: "Add your car to offer rides.", href: "/settings/car", action: "Add my car" };
  if (setup) {
    return {
      message: "Add a driver's licence that hasn't expired to offer rides.",
      href: "/settings/licence",
      action: "Update my licence",
    };
  }
  if (!profile.homeAddress) {
    return {
      message: "Add your home address first. Your rides start or end in your neighbourhood.",
      href: "/settings/route",
      action: "Add my address",
    };
  }
  return null;
}

function NotReady({ message, href, action }: NonNullable<ReturnType<typeof whatsMissing>>) {
  const styles = createStyles(useThemeColors());
  return (
    <View style={styles.wrapper}>
      <InfoCard title="Almost there">
        <Text style={styles.body}>{message}</Text>
        <Pressable onPress={() => router.push(href)} accessibilityRole="link">
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      </InfoCard>
    </View>
  );
}

function NewRideForm({ profile }: { profile: Profile }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { withToken } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);

  const carSeats = profile.vehicle!.seats;
  const days = upcomingDays(DAYS_SHOWN);
  const [direction, setDirection] = useState<RideDirection | null>(null);
  const [campus, setCampus] = useState<Campus | null>(profile.campus);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(carSeats);
  const [price, setPrice] = useState(
    profile.pricePerSeatCents === null ? "" : String(profile.pricePerSeatCents / 100),
  );
  const [notes, setNotes] = useState("");

  function change<T>(field: Field, setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      clearFieldError(field);
    };
  }

  function handleSave() {
    const errors: Partial<Record<Field, string>> = {};
    if (!direction) errors.direction = "Choose to or from campus.";
    if (!campus) errors.campus = "Choose the campus.";
    if (!date) errors.date = "Choose the day.";
    const leave = parseTime(time);
    if (!leave) errors.departAt = "Enter the time you leave, like 7:30 AM.";
    else if (date && chicagoMoment(date, leave).getTime() <= Date.now()) {
      errors.departAt = "That time has already passed. Choose a later time.";
    }
    const cents = parsePrice(price);
    if (cents === null || cents > MAX_PRICE_PER_SEAT_DOLLARS * 100) {
      errors.pricePerSeatCents = `Enter a price between $0 and $${MAX_PRICE_PER_SEAT_DOLLARS}.`;
    }

    save(
      errors,
      async () => {
        const ride = await withToken((token) =>
          postRide(token, {
            direction: direction!,
            campus: campus!,
            departAt: toChicagoIso(date!, leave!),
            seats,
            pricePerSeatCents: cents!,
            notes: notes.trim(),
          }),
        );
        router.replace({ pathname: "/rides/[id]", params: { id: String(ride.id) } });
      },
      { goBack: false },
    );
  }

  const seatOptions = Array.from({ length: carSeats }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }));
  const priceCents = parsePrice(price);

  return (
    <FormScreen
      intro="Riders near you can ask for a seat, and you choose who to take. Times are Chicago time."
      saveLabel="Offer this ride"
      saving={saving}
      formError={formError}
      onSave={handleSave}
    >
      <ChoiceChips
        label="Going"
        options={RIDE_DIRECTIONS}
        value={direction}
        onChange={change("direction", setDirection)}
        error={fieldErrors.direction}
      />
      <ChoiceChips
        label="Campus"
        options={CAMPUSES.map((option) => ({ value: option.value, label: option.label }))}
        value={campus}
        onChange={change("campus", setCampus)}
        error={fieldErrors.campus}
      />
      <ChoiceChips
        label="Day"
        options={days}
        value={date}
        onChange={change("date", setDate)}
        error={fieldErrors.date}
      />
      <TextField
        label="I leave at"
        value={time}
        onChangeText={change("departAt", setTime)}
        error={fieldErrors.departAt}
        placeholder="7:30 AM"
        autoCapitalize="characters"
        autoCorrect={false}
        hint={
          direction === "FROM_CAMPUS"
            ? "When you leave campus."
            : profile.homeArea
              ? `When you leave ${profile.homeArea}.`
              : undefined
        }
      />
      <ChoiceChips
        label="Seats for riders"
        options={seatOptions}
        value={seats}
        onChange={change("seats", setSeats)}
        error={fieldErrors.seats}
      />
      <TextField
        label="Price per seat ($)"
        value={price}
        onChangeText={change("pricePerSeatCents", setPrice)}
        error={fieldErrors.pricePerSeatCents}
        placeholder="5"
        keyboardType="decimal-pad"
        hint={`${priceCents !== null ? `${formatPrice(priceCents)} per rider. ` : ""}${PAYMENT_NOTE}`}
      />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={change("notes", setNotes)}
        error={fieldErrors.notes}
        placeholder="Where to meet, room for a bag, ..."
        multiline
        maxLength={200}
      />
    </FormScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrapper: {
      padding: 20,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    body: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 21,
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
      paddingVertical: 4,
    },
  });
}
