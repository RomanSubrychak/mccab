import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";

import { RideCard } from "@/components/ride-card";
import { ChoiceChips } from "@/components/settings";
import { InfoCard, TabScreen } from "@/components/tab-screen";
import { campusLabel } from "@/constants/profile-options";
import { useThemeColors, type Colors } from "@/constants/theme";
import {
  ApiError,
  getMyRides,
  searchRides,
  type Profile,
  type Ride,
  type RideDirection,
} from "@/lib/api";
import { useProfile } from "@/lib/profile";
import { upcomingDays } from "@/lib/ride-time";

type Styles = ReturnType<typeof createStyles>;
type Loaded<T> =
  { status: "loading" } | { status: "error"; message: string } | { status: "done"; data: T };

const ANY = "ANY";
const DIRECTION_FILTERS: { value: RideDirection | typeof ANY; label: string }[] = [
  { value: "TO_CAMPUS", label: "To campus" },
  { value: "FROM_CAMPUS", label: "From campus" },
  { value: ANY, label: "Both" },
];

export default function RidesScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { profile, withToken } = useProfile();
  // Bumped each time the tab comes into view, so lists refresh after acting on a ride.
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(useCallback(() => setFocusCount((count) => count + 1), []));

  const [mine, setMine] = useState<Loaded<{ driving: Ride[]; riding: Ride[] }>>({
    status: "loading",
  });
  useEffect(() => {
    if (focusCount === 0) return;
    let active = true;
    withToken(getMyRides)
      .then((data) => active && setMine({ status: "done", data }))
      .catch((error) => active && setMine({ status: "error", message: errorMessage(error) }));
    return () => {
      active = false;
    };
  }, [focusCount, withToken]);

  if (!profile) return <TabScreen title="Rides">{null}</TabScreen>;
  const driving = profile.activeMode === "DRIVING";

  return (
    <TabScreen
      title="Rides"
      subtitle={
        driving
          ? "Offer seats to students near you."
          : "Find a seat with a student driving to campus."
      }
    >
      {driving ? (
        <Pressable
          onPress={() => router.push("/rides/new")}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Offer a ride</Text>
        </Pressable>
      ) : null}

      <MyRides loaded={mine} driving={driving} styles={styles} colors={colors} />

      {!driving ? (
        <FindRides profile={profile} focusCount={focusCount} styles={styles} colors={colors} />
      ) : null}

      {profile.rideRole === "RIDER_DRIVER" ? (
        <Text style={styles.footnote}>
          {driving
            ? "To find a seat instead, switch to riding on Home."
            : "To offer seats, switch to driving on Home."}
        </Text>
      ) : null}
    </TabScreen>
  );
}

// The rides this student offers and the seats they asked for. The list for the
// current mode always shows; the other only when it has rides (a Rider & Driver
// switching modes still sees requests waiting for them).
function MyRides({
  loaded,
  driving,
  styles,
  colors,
}: {
  loaded: Loaded<{ driving: Ride[]; riding: Ride[] }>;
  driving: boolean;
  styles: Styles;
  colors: Colors;
}) {
  if (loaded.status !== "done") {
    return (
      <Section title={driving ? "Rides I'm offering" : "My seats"} styles={styles}>
        <Status loaded={loaded} styles={styles} colors={colors} />
      </Section>
    );
  }
  const offering = (
    <Section key="offering" title="Rides I'm offering" styles={styles}>
      {loaded.data.driving.length === 0 ? (
        <Text style={styles.muted}>You haven't offered any upcoming rides.</Text>
      ) : (
        loaded.data.driving.map((ride) => <RideCard key={ride.id} ride={ride} />)
      )}
    </Section>
  );
  const seats = (
    <Section key="seats" title="My seats" styles={styles}>
      {loaded.data.riding.length === 0 ? (
        <Text style={styles.muted}>You haven't asked for a seat yet. Find a ride below.</Text>
      ) : (
        loaded.data.riding.map((ride) => <RideCard key={ride.id} ride={ride} />)
      )}
    </Section>
  );
  const showOffering = driving || loaded.data.driving.length > 0;
  const showSeats = !driving || loaded.data.riding.length > 0;
  return (
    <>
      {driving
        ? [showOffering && offering, showSeats && seats]
        : [showSeats && seats, showOffering && offering]}
    </>
  );
}

function FindRides({
  profile,
  focusCount,
  styles,
  colors,
}: {
  profile: Profile;
  focusCount: number;
  styles: Styles;
  colors: Colors;
}) {
  const { withToken } = useProfile();
  const [direction, setDirection] = useState<RideDirection | typeof ANY>("TO_CAMPUS");
  const [day, setDay] = useState<string>(ANY);
  const [results, setResults] = useState<Loaded<Ride[]>>({ status: "loading" });
  const days = [{ value: ANY, label: "Any day" }, ...upcomingDays(7)];

  useEffect(() => {
    if (focusCount === 0 || !profile.campus) return;
    let active = true;
    setResults({ status: "loading" });
    withToken((token) =>
      searchRides(token, {
        campus: profile.campus!,
        direction: direction === ANY ? undefined : direction,
        date: day === ANY ? undefined : day,
      }),
    )
      .then((rides) => {
        // Rides already in "My seats" don't need to show twice.
        if (active) setResults({ status: "done", data: rides.filter((ride) => !ride.myBooking) });
      })
      .catch((error) => active && setResults({ status: "error", message: errorMessage(error) }));
    return () => {
      active = false;
    };
  }, [focusCount, direction, day, profile.campus, withToken]);

  if (!profile.campus) {
    return (
      <InfoCard title="Find a ride">
        <Text style={styles.muted}>
          Choose your campus first, so we can show rides going there.
        </Text>
        <Link
          label="Set up My route"
          onPress={() => router.push("/settings/route")}
          styles={styles}
        />
      </InfoCard>
    );
  }

  return (
    <Section title={`Find a ride · ${campusLabel(profile.campus)}`} styles={styles}>
      <ChoiceChips options={DIRECTION_FILTERS} value={direction} onChange={setDirection} />
      <ChoiceChips options={days} value={day} onChange={setDay} />
      {!profile.homeAddress ? (
        <View style={styles.notice}>
          <Text style={styles.muted}>
            Add your home address to see how far each ride is and to ask for a seat.
          </Text>
          <Link
            label="Add my address"
            onPress={() => router.push("/settings/route")}
            styles={styles}
          />
        </View>
      ) : null}
      {results.status !== "done" ? (
        <Status loaded={results} styles={styles} colors={colors} />
      ) : results.data.length === 0 ? (
        <Text style={styles.muted}>
          No rides with free seats {day === ANY ? "yet" : "that day"}. Check again later, or try
          another day.
        </Text>
      ) : (
        results.data.map((ride) => <RideCard key={ride.id} ride={ride} />)
      )}
    </Section>
  );
}

function Section({
  title,
  children,
  styles,
}: {
  title: string;
  children: React.ReactNode;
  styles: Styles;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Status({
  loaded,
  styles,
  colors,
}: {
  loaded: Loaded<unknown>;
  styles: Styles;
  colors: Colors;
}) {
  if (loaded.status === "error") return <Text style={styles.error}>{loaded.message}</Text>;
  return <ActivityIndicator color={colors.primary} style={styles.spinner} />;
}

function Link({ label, onPress, styles }: { label: string; onPress: () => void; styles: Styles }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Couldn't load rides. Open this tab again to retry.";
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    section: { gap: 12 },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    muted: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
    error: { color: colors.error, fontSize: 15, fontWeight: "500" },
    footnote: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
    spinner: { paddingVertical: 12 },
    notice: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 14,
      gap: 6,
    },
    link: { color: colors.primary, fontSize: 15, fontWeight: "700", paddingVertical: 4 },
    pressed: { opacity: 0.7 },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      minHeight: 52,
    },
    primaryButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
  });
}
