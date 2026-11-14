import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ChoiceChips, SettingsGroup, SettingsRow } from "@/components/settings";
import { InfoCard, TabScreen } from "@/components/tab-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  RIDE_MODES,
  campusLabel,
  rideRoleLabel,
  type RideMode,
} from "@/constants/profile-options";
import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, type Profile } from "@/lib/api";
import { firstName, formatPrice } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { driverSetupItems, missingProfileItems } from "@/lib/profile-checklist";

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { profile, update } = useProfile();
  const [modeError, setModeError] = useState<string | null>(null);

  if (!profile) return <TabScreen title="Hi">{null}</TabScreen>;

  const setupItems = driverSetupItems(profile);
  const missing = missingProfileItems(profile);
  const canSwitchMode = profile.rideRole === "RIDER_DRIVER";
  const driving = profile.activeMode === "DRIVING" && profile.driverStatus.ready;

  // A Rider & Driver switches between riding and driving. The server refuses
  // driving until a valid licence and a car are on file.
  async function switchMode(mode: RideMode) {
    setModeError(null);
    try {
      await update({ activeMode: mode });
    } catch (error) {
      setModeError(error instanceof ApiError ? error.message : "Couldn't switch. Try again.");
    }
  }

  return (
    <TabScreen
      title={`Hi, ${firstName(profile.name)}`}
      subtitle={`You're using MCCab as a ${rideRoleLabel(profile.rideRole)}.`}
      headerRight={<ThemeToggle />}
    >
      {canSwitchMode ? (
        <SettingsGroup
          title="Right now I'm"
          error={modeError}
          footer={
            driving
              ? "You're offering seats. Switch to riding to find a seat instead."
              : "Switch to driving on days you take your car."
          }
        >
          <View style={styles.padded}>
            <ChoiceChips options={RIDE_MODES} value={profile.activeMode} onChange={switchMode} />
          </View>
        </SettingsGroup>
      ) : null}

      {setupItems.length > 0 ? (
        <SettingsGroup
          title="Finish driver setup"
          footer="You need these before you can offer rides."
        >
          {setupItems.map((item) => (
            <SettingsRow
              key={item.label}
              icon="alert-circle-outline"
              label={item.label}
              onPress={() => router.push(item.href)}
            />
          ))}
        </SettingsGroup>
      ) : null}

      {driving ? <DrivingCard profile={profile} styles={styles} /> : null}
      {!driving && profile.rideRole !== "DRIVER" ? <RidingCard styles={styles} /> : null}

      {missing.length > 0 ? (
        <SettingsGroup
          title="Finish your profile"
          footer="Drivers and riders see your profile before sharing a ride with you."
        >
          {missing.map((item) => (
            <SettingsRow
              key={item.label}
              icon="ellipse-outline"
              label={item.label}
              onPress={() => router.push(item.href)}
            />
          ))}
        </SettingsGroup>
      ) : null}
    </TabScreen>
  );
}

type Styles = ReturnType<typeof createStyles>;

function RidingCard({ styles }: { styles: Styles }) {
  return (
    <InfoCard title="Finding a seat is coming soon">
      <Text style={styles.body}>
        Soon you'll see drivers near you who are going to your campus, and book a seat.
      </Text>
      <Pressable
        onPress={() => router.push("/profile")}
        accessibilityRole="link"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.link}>Set up your profile</Text>
      </Pressable>
    </InfoCard>
  );
}

function DrivingCard({ profile, styles }: { profile: Profile; styles: Styles }) {
  const car = profile.vehicle!;
  const campus = campusLabel(profile.campus);
  const price = formatPrice(profile.pricePerSeatCents);
  return (
    <InfoCard title="Offering rides is coming soon">
      <Text style={styles.body}>
        Soon you'll post your trips{campus ? ` to ${campus}` : ""} and riders near you can book
        your {car.seats} {car.seats === 1 ? "seat" : "seats"}
        {price ? ` for ${price} each` : ""}.
      </Text>
      <Text style={styles.muted}>
        {[car.color, car.make, car.model].join(" ")} · {car.plate}
      </Text>
    </InfoCard>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    padded: {
      padding: 16,
    },
    body: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 21,
    },
    muted: {
      color: colors.textMuted,
      fontSize: 13,
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
      paddingVertical: 4,
    },
    pressed: {
      opacity: 0.6,
    },
  });
}
