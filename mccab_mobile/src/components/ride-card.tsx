import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";

import { BOOKING_STATUS_LABELS, tripLabel } from "@/constants/ride-options";
import { useThemeColors, type Colors } from "@/constants/theme";
import type { Ride } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { formatRideTime } from "@/lib/ride-time";

// A ride in a list: when, where, who and how much. Opens the ride's screen.
export function RideCard({ ride }: { ride: Ride }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const badge = rideBadge(ride);
  const details = [
    ride.isMine ? null : `${ride.driver.firstName} is driving`,
    ride.distanceKm === null ? null : `${ride.distanceKm} km from you`,
    ride.status === "OPEN"
      ? `${ride.seatsLeft} of ${ride.seatsOffered} ${ride.seatsOffered === 1 ? "seat" : "seats"} left`
      : null,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/rides/[id]", params: { id: String(ride.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={[formatRideTime(ride.departAt), tripLabel(ride), badge?.label, ...details]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.top}>
        <Text style={styles.time}>{formatRideTime(ride.departAt)}</Text>
        <Text style={styles.price}>{formatPrice(ride.pricePerSeatCents)}</Text>
      </View>
      <Text style={styles.trip} numberOfLines={2}>
        {tripLabel(ride)}
      </Text>
      {details.length > 0 ? <Text style={styles.details}>{details.join(" · ")}</Text> : null}
      {badge ? (
        <View style={styles.badgeRow}>
          <View style={[styles.badge, badge.tone === "alert" && styles.badgeAlert]}>
            <Ionicons
              name={badge.icon}
              size={14}
              color={badge.tone === "alert" ? colors.error : colors.primary}
            />
            <Text style={[styles.badgeText, badge.tone === "alert" && styles.badgeTextAlert]}>
              {badge.label}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

type Badge = {
  label: string;
  icon: "checkmark-circle" | "time-outline" | "close-circle" | "people" | "flag";
  tone?: "alert";
};

// The one thing the student most needs to know about this ride.
function rideBadge(ride: Ride): Badge | null {
  if (ride.status === "CANCELLED")
    return { label: "Ride cancelled", icon: "close-circle", tone: "alert" };
  if (ride.status === "COMPLETED") return { label: "Ride done", icon: "flag" };
  if (ride.isMine) {
    const waiting = ride.bookings?.filter((booking) => booking.status === "REQUESTED").length ?? 0;
    if (waiting > 0) {
      return {
        label: `${waiting} ${waiting === 1 ? "request" : "requests"} to answer`,
        icon: "time-outline",
        tone: "alert",
      };
    }
    const riders = ride.seatsOffered - ride.seatsLeft;
    return {
      label:
        riders === 0 ? "No riders yet" : `${riders} ${riders === 1 ? "rider" : "riders"} confirmed`,
      icon: "people",
    };
  }
  if (!ride.myBooking) return null;
  const status = ride.myBooking.status;
  return {
    label: BOOKING_STATUS_LABELS[status],
    icon:
      status === "ACCEPTED"
        ? "checkmark-circle"
        : status === "REQUESTED"
          ? "time-outline"
          : "close-circle",
    tone: status === "DECLINED" || status === "CANCELLED" ? "alert" : undefined,
  };
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      gap: 6,
    },
    pressed: {
      opacity: 0.7,
    },
    top: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
    },
    time: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    price: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    trip: {
      color: colors.text,
      fontSize: 15,
    },
    details: {
      color: colors.textMuted,
      fontSize: 13,
    },
    badgeRow: {
      flexDirection: "row",
      marginTop: 4,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: `${colors.primary}14`,
    },
    badgeAlert: {
      backgroundColor: colors.errorBackground,
    },
    badgeText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    badgeTextAlert: {
      color: colors.error,
    },
  });
}
