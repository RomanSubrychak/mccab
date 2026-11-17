import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { campusLabel, CAMPUSES } from "@/constants/profile-options";
import { BOOKING_STATUS_LABELS, PAYMENT_NOTE, tripLabel } from "@/constants/ride-options";
import { useBackFallback } from "@/components/back-fallback";
import { useThemeColors, type Colors } from "@/constants/theme";
import {
  ApiError,
  getRide,
  rideAction,
  type Ride,
  type RideAction,
  type RideBooking,
} from "@/lib/api";
import { formatPhone, formatPrice } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { formatRideTime } from "@/lib/ride-time";

type Styles = ReturnType<typeof createStyles>;

// One ride. A rider asks for a seat or cancels it; the driver answers requests,
// sees confirmed riders' contact details and pickup addresses, and can cancel.
export default function RideScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { withToken, profile } = useProfile();
  useBackFallback("/rides");

  const [ride, setRide] = useState<Ride | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Destructive actions need a second tap ("Yes, cancel").
  const [confirming, setConfirming] = useState<string | null>(null);

  // Reload whenever the screen comes back into view: the other person may have acted.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      withToken((token) => getRide(token, Number(id)))
        .then((loaded) => {
          if (!active) return;
          setRide(loaded);
          setLoadError(null);
        })
        .catch((error) => {
          if (active)
            setLoadError(error instanceof ApiError ? error.message : "Couldn't load this ride.");
        });
      return () => {
        active = false;
      };
    }, [id, withToken]),
  );

  async function run(key: string, action: RideAction) {
    if (busy) return;
    setBusy(key);
    setActionError(null);
    setConfirming(null);
    try {
      setRide(await withToken((token) => rideAction(token, action)));
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "Something went wrong. Try again.",
      );
      // The ride may have changed (e.g. the last seat was taken): show it as it is now.
      withToken((token) => getRide(token, Number(id)))
        .then(setRide)
        .catch(() => {});
    } finally {
      setBusy(null);
    }
  }

  if (!ride) {
    return (
      <View style={styles.centered}>
        {loadError ? (
          <Text style={styles.muted}>{loadError}</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  const campus = CAMPUSES.find((option) => option.value === ride.campus);
  const helpers = { run, busy, confirming, setConfirming, styles, colors };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {ride.status !== "OPEN" ? (
          <View style={styles.banner}>
            <Ionicons
              name={ride.status === "CANCELLED" ? "close-circle" : "flag"}
              size={18}
              color={ride.status === "CANCELLED" ? colors.error : colors.textMuted}
            />
            <Text style={[styles.bannerText, ride.status === "CANCELLED" && styles.errorText]}>
              {ride.status === "CANCELLED"
                ? "This ride was cancelled."
                : "This ride has already left."}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.time}>{formatRideTime(ride.departAt)}</Text>
          <Text style={styles.trip}>{tripLabel(ride)}</Text>
          {campus ? <Text style={styles.muted}>{campus.address}</Text> : null}
          <View style={styles.facts}>
            <Fact
              icon="cash-outline"
              text={`${formatPrice(ride.pricePerSeatCents)} per seat`}
              styles={styles}
              colors={colors}
            />
            <Fact
              icon="people-outline"
              text={`${ride.seatsLeft} of ${ride.seatsOffered} ${ride.seatsOffered === 1 ? "seat" : "seats"} left`}
              styles={styles}
              colors={colors}
            />
            {ride.distanceKm !== null ? (
              <Fact
                icon="navigate-outline"
                text={`About ${ride.distanceKm} km from your home`}
                styles={styles}
                colors={colors}
              />
            ) : null}
          </View>
          {ride.notes ? <Text style={styles.notes}>“{ride.notes}”</Text> : null}
          <Text style={styles.muted}>{PAYMENT_NOTE}</Text>
        </View>

        {actionError ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {ride.isMine ? (
          <DriverView ride={ride} {...helpers} />
        ) : (
          <RiderView
            ride={ride}
            hasAddress={Boolean(profile?.homeAddress)}
            isDriverOnly={profile?.rideRole === "DRIVER"}
            {...helpers}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type Helpers = {
  run: (key: string, action: RideAction) => void;
  busy: string | null;
  confirming: string | null;
  setConfirming: (key: string | null) => void;
  styles: Styles;
  colors: Colors;
};

// ---- Rider ----

function RiderView({
  ride,
  hasAddress,
  isDriverOnly,
  run,
  busy,
  confirming,
  setConfirming,
  styles,
  colors,
}: { ride: Ride; hasAddress: boolean; isDriverOnly: boolean } & Helpers) {
  const booking = ride.myBooking;
  const open = ride.status === "OPEN";
  const driver = ride.driver.firstName;
  // The server decides: details come only after acceptance, while the ride is
  // happening (until a day after it leaves).
  const shared =
    booking?.status === "ACCEPTED" && (ride.driver.vehicle !== null || ride.driver.phone !== null);

  return (
    <>
      <Section title={`Driver: ${driver}`} styles={styles}>
        {shared ? (
          <>
            <ContactRow phone={ride.driver.phone} name={driver} styles={styles} colors={colors} />
            {ride.driver.vehicle ? (
              <Text style={styles.body}>
                {[
                  ride.driver.vehicle.color,
                  ride.driver.vehicle.make,
                  ride.driver.vehicle.model,
                ].join(" ")}{" "}
                · <Text style={styles.strong}>{ride.driver.vehicle.plate}</Text>
              </Text>
            ) : null}
            <Text style={styles.muted}>{driver} sees your home address as the pickup point.</Text>
          </>
        ) : (
          <Text style={styles.muted}>
            {booking?.status === "ACCEPTED"
              ? "Contact details are no longer shared for this ride."
              : open
                ? `You'll see ${driver}'s phone number and car once they accept your request.`
                : `${driver} offered this ride.`}
          </Text>
        )}
      </Section>

      {booking ? (
        <View style={styles.statusRow}>
          <Ionicons
            name={
              booking.status === "ACCEPTED"
                ? "checkmark-circle"
                : booking.status === "REQUESTED"
                  ? "time-outline"
                  : "close-circle"
            }
            size={20}
            color={
              booking.status === "ACCEPTED"
                ? colors.primary
                : booking.status === "REQUESTED"
                  ? colors.textMuted
                  : colors.error
            }
          />
          <Text style={styles.statusText}>
            {booking.status === "REQUESTED"
              ? `Waiting for ${driver} to answer`
              : BOOKING_STATUS_LABELS[booking.status]}
          </Text>
        </View>
      ) : null}

      {!open ? null : booking?.status === "REQUESTED" || booking?.status === "ACCEPTED" ? (
        <ConfirmButton
          id="cancelBooking"
          label={booking.status === "ACCEPTED" ? "Cancel my seat" : "Cancel my request"}
          confirmLabel={
            booking.status === "ACCEPTED"
              ? `Yes, cancel. I'll let ${driver} know.`
              : "Yes, cancel my request"
          }
          onConfirm={() => run("cancelBooking", { type: "cancelBooking", bookingId: booking.id })}
          {...{ busy, confirming, setConfirming, styles, colors }}
        />
      ) : booking?.status === "DECLINED" ? (
        <Text style={styles.muted}>{driver} can't take you on this ride. Try another one.</Text>
      ) : isDriverOnly ? (
        <Text style={styles.muted}>Switch to Rider or Rider & Driver to book seats.</Text>
      ) : !hasAddress ? (
        <View style={styles.gap}>
          <Text style={styles.muted}>Add your home address first. It's your pickup point.</Text>
          <Button
            label="Add my address"
            onPress={() => router.push("/settings/route")}
            styles={styles}
            colors={colors}
            secondary
          />
        </View>
      ) : ride.seatsLeft === 0 ? (
        <Text style={styles.muted}>This ride is full.</Text>
      ) : (
        <Button
          label={booking?.status === "CANCELLED" ? "Ask for a seat again" : "Ask for a seat"}
          busy={busy === "request"}
          onPress={() => run("request", { type: "request", rideId: ride.id })}
          styles={styles}
          colors={colors}
        />
      )}
    </>
  );
}

// ---- Driver ----

function DriverView({
  ride,
  run,
  busy,
  confirming,
  setConfirming,
  styles,
  colors,
}: { ride: Ride } & Helpers) {
  const bookings = ride.bookings ?? [];
  const waiting = bookings.filter((booking) => booking.status === "REQUESTED");
  const confirmed = bookings.filter((booking) => booking.status === "ACCEPTED");
  const open = ride.status === "OPEN";

  return (
    <>
      {open ? (
        <Section title={`Requests (${waiting.length})`} styles={styles}>
          {waiting.length === 0 ? (
            <Text style={styles.muted}>
              No requests waiting. Riders near you see this ride when they search{" "}
              {campusLabel(ride.campus)}.
            </Text>
          ) : (
            waiting.map((booking) => (
              <View key={booking.id} style={styles.person}>
                <RiderSummary booking={booking} styles={styles} />
                <View style={styles.buttonRow}>
                  <Button
                    label="Accept"
                    busy={busy === `accept-${booking.id}`}
                    disabled={ride.seatsLeft === 0}
                    onPress={() =>
                      run(`accept-${booking.id}`, { type: "accept", bookingId: booking.id })
                    }
                    styles={styles}
                    colors={colors}
                    compact
                  />
                  <Button
                    label="Decline"
                    busy={busy === `decline-${booking.id}`}
                    onPress={() =>
                      run(`decline-${booking.id}`, { type: "decline", bookingId: booking.id })
                    }
                    styles={styles}
                    colors={colors}
                    compact
                    secondary
                  />
                </View>
              </View>
            ))
          )}
          {waiting.length > 0 && ride.seatsLeft === 0 ? (
            <Text style={styles.muted}>
              All your seats are taken. Decline the rest so they can find another ride.
            </Text>
          ) : null}
        </Section>
      ) : null}

      <Section title={`Riders (${confirmed.length} of ${ride.seatsOffered})`} styles={styles}>
        {confirmed.length === 0 ? (
          <Text style={styles.muted}>No confirmed riders yet.</Text>
        ) : (
          confirmed.map((booking) => (
            <View key={booking.id} style={styles.person}>
              <RiderSummary booking={booking} styles={styles} />
              {booking.rider.pickupAddress ? (
                <Pressable
                  onPress={() => openInMaps(booking.rider.pickupAddress!)}
                  style={styles.inlineAction}
                  accessibilityRole="link"
                  accessibilityLabel={`Pickup: ${booking.rider.pickupAddress}. Opens in Maps.`}
                >
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <Text style={styles.link}>{booking.rider.pickupAddress}</Text>
                </Pressable>
              ) : null}
              <ContactRow
                phone={booking.rider.phone}
                name={booking.rider.firstName}
                styles={styles}
                colors={colors}
              />
            </View>
          ))
        )}
      </Section>

      {open ? (
        <ConfirmButton
          id="cancelRide"
          label="Cancel this ride"
          confirmLabel={
            confirmed.length > 0
              ? `Yes, cancel. I'll tell my ${confirmed.length === 1 ? "rider" : "riders"}.`
              : "Yes, cancel this ride"
          }
          onConfirm={() => run("cancelRide", { type: "cancelRide", rideId: ride.id })}
          {...{ busy, confirming, setConfirming, styles, colors }}
        />
      ) : null}
    </>
  );
}

function RiderSummary({ booking, styles }: { booking: RideBooking; styles: Styles }) {
  return (
    <View>
      <Text style={styles.strong}>{booking.rider.firstName}</Text>
      {booking.rider.area ? <Text style={styles.muted}>{booking.rider.area}</Text> : null}
    </View>
  );
}

// ---- Small pieces ----

function openInMaps(address: string) {
  const query = encodeURIComponent(address);
  Linking.openURL(
    Platform.OS === "ios"
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`,
  ).catch(() => {});
}

function ContactRow({
  phone,
  name,
  styles,
  colors,
}: {
  phone: string | null;
  name: string;
  styles: Styles;
  colors: Colors;
}) {
  if (!phone) return <Text style={styles.muted}>{name} keeps their phone number private.</Text>;
  return (
    <Pressable
      onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})}
      style={styles.inlineAction}
      accessibilityRole="link"
      accessibilityLabel={`Call ${name}, ${formatPhone(phone)}`}
    >
      <Ionicons name="call-outline" size={18} color={colors.primary} />
      <Text style={styles.link}>{formatPhone(phone)}</Text>
    </Pressable>
  );
}

function Section({
  title,
  children,
  styles,
}: {
  title: string;
  children: ReactNode;
  styles: Styles;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Fact({
  icon,
  text,
  styles,
  colors,
}: {
  icon: "cash-outline" | "people-outline" | "navigate-outline";
  text: string;
  styles: Styles;
  colors: Colors;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
  destructive = false,
  compact = false,
  styles,
  colors,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  destructive?: boolean;
  compact?: boolean;
  styles: Styles;
  colors: Colors;
}) {
  const inactive = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        secondary && styles.buttonSecondary,
        // A quiet destructive button keeps a clear background with red text.
        destructive && (secondary ? styles.buttonSecondaryDestructive : styles.buttonDestructive),
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.onPrimary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            secondary && styles.buttonTextSecondary,
            destructive && secondary && styles.errorText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// A quiet button that asks "Are you sure?" inline before doing something that
// can't be undone. (No browser or system dialogs: they block the web app.)
function ConfirmButton({
  id,
  label,
  confirmLabel,
  onConfirm,
  busy,
  confirming,
  setConfirming,
  styles,
  colors,
}: {
  id: string;
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
} & Omit<Helpers, "run">) {
  if (confirming !== id) {
    return (
      <Button
        label={label}
        onPress={() => setConfirming(id)}
        styles={styles}
        colors={colors}
        secondary
        destructive
      />
    );
  }
  return (
    <View style={styles.gap}>
      <Button
        label={confirmLabel}
        busy={busy === id}
        onPress={onConfirm}
        styles={styles}
        colors={colors}
        destructive
      />
      <Button
        label="Keep it"
        onPress={() => setConfirming(null)}
        styles={styles}
        colors={colors}
        secondary
      />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    content: { padding: 20, gap: 20, width: "100%", maxWidth: 560, alignSelf: "center" },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 18,
      gap: 10,
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bannerText: { flex: 1, color: colors.textMuted, fontSize: 15, fontWeight: "600" },
    time: { color: colors.text, fontSize: 22, fontWeight: "800" },
    trip: { color: colors.text, fontSize: 16, fontWeight: "600" },
    facts: { gap: 6, marginTop: 4 },
    fact: { flexDirection: "row", alignItems: "center", gap: 8 },
    notes: { color: colors.text, fontSize: 15, fontStyle: "italic" },
    section: { gap: 8 },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    person: { gap: 8, paddingVertical: 4 },
    body: { color: colors.text, fontSize: 15, lineHeight: 21 },
    muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    strong: { color: colors.text, fontSize: 15, fontWeight: "700" },
    link: { flex: 1, color: colors.primary, fontSize: 15, fontWeight: "600" },
    inlineAction: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    statusText: { color: colors.text, fontSize: 15, fontWeight: "600" },
    gap: { gap: 10 },
    buttonRow: { flexDirection: "row", gap: 10 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      minHeight: 52,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonCompact: { flex: 1, minHeight: 44 },
    buttonSecondary: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    buttonDestructive: { backgroundColor: colors.error },
    buttonSecondaryDestructive: { borderColor: colors.error },
    buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700", textAlign: "center" },
    buttonTextSecondary: { color: colors.primary },
    pressed: { opacity: 0.8 },
    disabled: { opacity: 0.5 },
    errorBox: { backgroundColor: colors.errorBackground, borderRadius: 12, padding: 12 },
    errorText: { color: colors.error, fontSize: 14, fontWeight: "600" },
  });
}
