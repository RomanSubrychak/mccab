import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { RideCard } from "@/components/ride-card";
import { ChoiceChips, SettingsGroup, SettingsRow } from "@/components/settings";
import { InfoCard, TabScreen } from "@/components/tab-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import { RIDE_MODES, rideRoleLabel, type RideMode } from "@/constants/profile-options";
import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, getMyRides, type Ride } from "@/lib/api";
import { firstName } from "@/lib/format";
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

      <NextRide
        driving={profile.activeMode === "DRIVING"}
        canOffer={setupItems.length === 0}
        styles={styles}
      />

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

// The student's next ride (offered, or a seat requested or confirmed), or a
// way to find or offer one. Reloads whenever Home comes into view.
function NextRide({
  driving,
  canOffer,
  styles,
}: {
  driving: boolean;
  canOffer: boolean;
  styles: Styles;
}) {
  const { withToken } = useProfile();
  const [next, setNext] = useState<Ride | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      withToken(getMyRides)
        .then(({ driving: offered, riding }) => {
          const upcoming = [
            ...offered.filter((ride) => ride.status === "OPEN"),
            ...riding.filter(
              (ride) =>
                ride.status === "OPEN" &&
                (ride.myBooking?.status === "ACCEPTED" || ride.myBooking?.status === "REQUESTED"),
            ),
          ].sort((a, b) => a.departAt.localeCompare(b.departAt));
          if (active) setNext(upcoming[0] ?? null);
        })
        .catch(() => active && setNext(null));
      return () => {
        active = false;
      };
    }, [withToken]),
  );

  if (next === undefined) return null;
  if (next) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Your next ride
        </Text>
        <RideCard ride={next} />
      </View>
    );
  }
  if (driving && !canOffer) return null; // "Finish driver setup" above says what to do.
  return (
    <InfoCard title="No upcoming rides">
      <Text style={styles.body}>
        {driving
          ? "Offer your next trip to campus, and students near you can ask for a seat."
          : "See who's driving to your campus and ask for a seat."}
      </Text>
      <Pressable
        onPress={() => router.push(driving ? "/rides/new" : "/rides")}
        accessibilityRole="link"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.link}>{driving ? "Offer a ride" : "Find a ride"}</Text>
      </Pressable>
    </InfoCard>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    padded: {
      padding: 16,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
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
    pressed: {
      opacity: 0.6,
    },
  });
}
