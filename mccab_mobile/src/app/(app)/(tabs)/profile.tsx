import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
  Avatar,
  ChoiceChips,
  SettingsGroup,
  SettingsRow,
  SwitchRow,
} from "@/components/settings";
import { TabScreen } from "@/components/tab-screen";
import {
  CHAT_PREFERENCES,
  RIDE_ROLES,
  WEEKDAYS,
  campusLabel,
  isDriver,
  rideRoleLabel,
} from "@/constants/profile-options";
import { useTheme, useThemeColors, type Colors, type ThemePreference } from "@/constants/theme";
import { ApiError, type Profile, type ProfileChanges } from "@/lib/api";
import { expiryState, formatDate, formatPrice, formatTime } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { useSession } from "@/lib/session";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { profile, isLoading, loadError, reload, update } = useProfile();
  const { preference, setPreference } = useTheme();
  const { signOut } = useSession();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  if (!profile) {
    return (
      <TabScreen title="Profile">
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.muted}>{loadError ?? "Couldn't load your profile."}</Text>
            <Pressable onPress={reload} accessibilityRole="button">
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        )}
      </TabScreen>
    );
  }

  // Notification switches save right away.
  async function saveToggle(changes: ProfileChanges) {
    setToggleError(null);
    try {
      await update(changes);
    } catch (error) {
      setToggleError(error instanceof ApiError ? error.message : "Couldn't save. Try again.");
    }
  }

  // Switching role saves right away. Driving itself needs a licence and a car,
  // which the Driving section below (and Home) ask for.
  async function changeRole(rideRole: (typeof RIDE_ROLES)[number]["value"]) {
    setRoleError(null);
    try {
      await update({ rideRole });
    } catch (error) {
      setRoleError(error instanceof ApiError ? error.message : "Couldn't save. Try again.");
    }
  }

  const driver = isDriver(profile.rideRole);

  return (
    <TabScreen title="Profile">
      <View style={styles.headerCard}>
        <Avatar name={profile.name} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.muted}>{profile.email}</Text>
          <View style={styles.badges}>
            {profile.rideRole ? (
              <Badge styles={styles} label={rideRoleLabel(profile.rideRole)!} />
            ) : null}
            {profile.campus ? <Badge styles={styles} label={campusLabel(profile.campus)!} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat
          styles={styles}
          label="Rating"
          value={
            profile.stats.ratingAverage === null
              ? "New"
              : `★ ${profile.stats.ratingAverage.toFixed(1)}`
          }
        />
        <Stat styles={styles} label="Rides given" value={String(profile.stats.ridesGiven)} />
        <Stat styles={styles} label="Rides taken" value={String(profile.stats.ridesTaken)} />
      </View>

      <SettingsGroup
        title="I use MCCab as"
        error={roleError}
        footer={RIDE_ROLES.find((role) => role.value === profile.rideRole)?.description}
      >
        <View style={styles.padded}>
          <ChoiceChips
            options={RIDE_ROLES.map((role) => ({ value: role.value, label: role.label }))}
            value={profile.rideRole}
            onChange={changeRole}
          />
        </View>
      </SettingsGroup>

      {driver ? (
        <SettingsGroup
          title="Driving"
          footer={
            profile.driverStatus.ready
              ? "Riders only see that your licence and insurance are on file, never the numbers."
              : "You need a valid licence and a car before you can switch to driving."
          }
        >
          <SettingsRow
            icon="card-outline"
            label="Driver's licence"
            value={licenceSummary(profile)}
            warning={documentWarning(profile.licence?.expiresOn)}
            onPress={() => router.push("/settings/licence")}
          />
          <SettingsRow
            icon="car-outline"
            label="My car"
            value={carSummary(profile)}
            warning={!profile.vehicle}
            onPress={() => router.push("/settings/car")}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Insurance"
            value={insuranceSummary(profile)}
            warning={documentWarning(profile.insurance?.expiresOn)}
            onPress={() => router.push("/settings/insurance")}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title="My profile">
        <SettingsRow
          icon="person-circle-outline"
          label="About me"
          value={aboutSummary(profile)}
          onPress={() => router.push("/settings/about")}
        />
        <SettingsRow
          icon="map-outline"
          label="My route"
          value={routeSummary(profile)}
          onPress={() => router.push("/settings/route")}
        />
        <SettingsRow
          icon="options-outline"
          label="Ride preferences"
          value={preferencesSummary(profile)}
          onPress={() => router.push("/settings/preferences")}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Safety"
          value={
            profile.emergencyContactName
              ? `Emergency contact: ${profile.emergencyContactName}`
              : "Add an emergency contact"
          }
          onPress={() => router.push("/settings/safety")}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Notifications"
        error={toggleError}
        footer="Notifications start working once rides are available."
      >
        <SwitchRow
          label="Ride updates"
          description="Requests, confirmations and changes to your rides"
          value={profile.notifyRideUpdates}
          onValueChange={(value) => saveToggle({ notifyRideUpdates: value })}
        />
        <SwitchRow
          label="Messages"
          description="When a driver or rider writes to you"
          value={profile.notifyMessages}
          onValueChange={(value) => saveToggle({ notifyMessages: value })}
        />
        <SwitchRow
          label="News and tips"
          description="Occasional updates about MCCab"
          value={profile.notifyNews}
          onValueChange={(value) => saveToggle({ notifyNews: value })}
        />
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <View style={styles.padded}>
          <ChoiceChips options={THEME_OPTIONS} value={preference} onChange={setPreference} />
        </View>
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow
          icon="key-outline"
          label="Change password"
          onPress={() => router.push("/settings/password")}
        />
        <SettingsRow icon="log-out-outline" label="Log out" onPress={signOut} showChevron={false} />
        <SettingsRow
          icon="trash-outline"
          label="Delete account"
          destructive
          onPress={() => router.push("/settings/delete-account")}
        />
      </SettingsGroup>
    </TabScreen>
  );

}

type Styles = ReturnType<typeof createStyles>;

function Badge({ styles, label }: { styles: Styles; label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function Stat({ styles, label, value }: { styles: Styles; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---- One-line summaries shown under each row. ----

function aboutSummary(profile: Profile): string {
  const parts = [
    profile.major,
    profile.graduationYear ? `Class of ${profile.graduationYear}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Add your phone, major and a short bio";
}

// True when a document is missing, expired or expires within 30 days.
function documentWarning(expiresOn: string | undefined): boolean {
  return !expiresOn || expiryState(expiresOn) !== "ok";
}

function expirySummary(expiresOn: string): string {
  const date = formatDate(expiresOn);
  const state = expiryState(expiresOn);
  if (state === "expired") return `Expired ${date}: update it`;
  if (state === "soon") return `Expires ${date}: renew soon`;
  return `Expires ${date}`;
}

function licenceSummary(profile: Profile): string {
  const licence = profile.licence;
  if (!licence) return "Add your licence: needed to drive";
  return `${licence.state} •••• ${licence.last4} · ${expirySummary(licence.expiresOn)}`;
}

function insuranceSummary(profile: Profile): string {
  const insurance = profile.insurance;
  if (!insurance) return "Add your insurance details";
  const policy = insurance.policyLast4 ? ` •••• ${insurance.policyLast4}` : "";
  return `${insurance.provider}${policy} · ${expirySummary(insurance.expiresOn)}`;
}

function carSummary(profile: Profile): string {
  const car = profile.vehicle;
  if (!car) return "Add your car so riders can find you";
  const name = [car.color, car.year, car.make, car.model].filter(Boolean).join(" ");
  return `${name} · ${car.plate} · ${car.seats} ${car.seats === 1 ? "seat" : "seats"}`;
}

function routeSummary(profile: Profile): string {
  const days = WEEKDAYS.filter((day) => profile.rideDays.includes(day.value))
    .map((day) => day.label)
    .join(", ");
  const times = [
    profile.arriveBy ? `arrive by ${formatTime(profile.arriveBy)}` : null,
    profile.leaveAt ? `leave at ${formatTime(profile.leaveAt)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const parts = [campusLabel(profile.campus), profile.homeArea, days, times].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Choose your campus and where you start from";
}

function preferencesSummary(profile: Profile): string {
  const parts = [
    isDriver(profile.rideRole) && profile.pricePerSeatCents !== null
      ? `${formatPrice(profile.pricePerSeatCents)} per seat`
      : null,
    CHAT_PREFERENCES.find((option) => option.value === profile.chatPreference)?.label,
    profile.musicOk ? "Music OK" : "No music",
    profile.smokingOk ? "Smoking OK" : "No smoking",
  ].filter(Boolean);
  return parts.join(" · ");
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    loading: {
      marginTop: 40,
    },
    centered: {
      alignItems: "center",
      gap: 12,
      marginTop: 40,
    },
    muted: {
      color: colors.textMuted,
      fontSize: 14,
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
    headerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    name: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
    },
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 6,
    },
    badge: {
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    stats: {
      flexDirection: "row",
      gap: 12,
    },
    stat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 14,
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 12,
    },
    padded: {
      padding: 16,
    },
  });
}
