import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import { SettingsGroup, SettingsRow } from "@/components/settings";
import { InfoCard, TabScreen } from "@/components/tab-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import { rideRoleLabel } from "@/constants/profile-options";
import { useThemeColors, type Colors } from "@/constants/theme";
import { firstName } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { missingProfileItems } from "@/lib/profile-checklist";

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { profile } = useProfile();
  const missing = profile ? missingProfileItems(profile) : [];

  return (
    <TabScreen
      title={profile ? `Hi, ${firstName(profile.name)}` : "Hi"}
      subtitle={
        profile?.rideRole
          ? `You're using MCCab as a ${rideRoleLabel(profile.rideRole)}.`
          : "Share rides to campus with fellow MCC students."
      }
      headerRight={<ThemeToggle />}
    >
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

      <InfoCard title="Finding rides is coming soon">
        <Text style={styles.body}>
          Soon you'll be able to find students near you who are going to the same campus, or offer
          seats in your car.
        </Text>
        <Pressable
          onPress={() => router.push("/profile")}
          accessibilityRole="link"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.link}>Set up your profile</Text>
        </Pressable>
      </InfoCard>
    </TabScreen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
