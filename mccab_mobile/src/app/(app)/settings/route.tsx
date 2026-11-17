import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AddressField } from "@/components/address-field";
import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { ChoiceChips } from "@/components/settings";
import { TextField } from "@/components/text-field";
import { CAMPUSES, WEEKDAYS, type Campus, type Weekday } from "@/constants/profile-options";
import { useThemeColors, type Colors } from "@/constants/theme";
import type { AddressSuggestion, Profile, ProfileChanges } from "@/lib/api";
import { formatTime, parseTime } from "@/lib/format";
import { useProfile } from "@/lib/profile";

const FIELDS = ["campus", "homePlace", "rideDays", "arriveBy", "leaveAt"] as const;
type Field = (typeof FIELDS)[number];

export default function RouteScreen() {
  return <WithProfile>{(profile) => <RouteForm profile={profile} />}</WithProfile>;
}

function RouteForm({ profile }: { profile: Profile }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { update } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);

  const [campus, setCampus] = useState<Campus | null>(profile.campus);
  // The text in the address field, and the suggestion it came from (null until
  // the student picks one). Typed text that wasn't picked is never saved.
  const [address, setAddress] = useState(profile.homeAddress ?? "");
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);
  const [rideDays, setRideDays] = useState<Weekday[]>(profile.rideDays);
  const [arriveBy, setArriveBy] = useState(formatTime(profile.arriveBy) ?? "");
  const [leaveAt, setLeaveAt] = useState(formatTime(profile.leaveAt) ?? "");

  function handleSave() {
    const errors: Partial<Record<Field, string>> = {};
    const arrive = arriveBy.trim() ? parseTime(arriveBy) : null;
    const leave = leaveAt.trim() ? parseTime(leaveAt) : null;
    if (arriveBy.trim() && !arrive) errors.arriveBy = "Enter a time like 8:30 AM.";
    if (leaveAt.trim() && !leave) errors.leaveAt = "Enter a time like 5:15 PM.";

    const changes: ProfileChanges = { campus, rideDays, arriveBy: arrive, leaveAt: leave };
    const text = address.trim();
    if (picked && text === picked.address) {
      changes.homePlace = picked.token;
    } else if (!text) {
      // An emptied field removes the saved address. An old free-text area (with
      // no address) starts out empty here, so it stays until an address is picked.
      if (profile.homeAddress) changes.homePlace = null;
    } else if (text !== profile.homeAddress) {
      errors.homePlace = "Choose your address from the list.";
    }

    save(errors, () => update(changes));
  }

  return (
    <FormScreen
      intro="Used to match you with students who live near you and go to the same campus."
      saving={saving}
      formError={formError}
      onSave={handleSave}
    >
      <View style={styles.field} accessibilityRole="radiogroup">
        <Text style={styles.label}>My campus</Text>
        {CAMPUSES.map((option) => {
          const selected = campus === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setCampus(option.value);
                clearFieldError("campus");
              }}
              style={({ pressed }) => [
                styles.campus,
                selected && styles.campusSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label}, ${option.address}`}
            >
              <View style={styles.campusText}>
                <Text style={styles.campusName}>{option.label}</Text>
                <Text style={styles.campusAddress}>{option.address}</Text>
              </View>
              <Ionicons
                name={selected ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={selected ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
        {fieldErrors.campus ? <Text style={styles.error}>{fieldErrors.campus}</Text> : null}
      </View>

      <AddressField
        label="Home address"
        value={address}
        onChangeText={(value) => {
          setAddress(value);
          setPicked(null);
          clearFieldError("homePlace");
        }}
        onSelect={(suggestion) => {
          setAddress(suggestion.address);
          setPicked(suggestion);
          clearFieldError("homePlace");
        }}
        error={fieldErrors.homePlace}
        hint={addressHint(profile, picked)}
        placeholder="Start typing, like 1234 W 18th St"
      />

      <ChoiceChips
        label="Days I go to campus"
        multiple
        options={WEEKDAYS}
        value={rideDays}
        onChange={(value) => {
          setRideDays(value);
          clearFieldError("rideDays");
        }}
        error={fieldErrors.rideDays}
      />

      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Arrive by"
            value={arriveBy}
            onChangeText={(value) => {
              setArriveBy(value);
              clearFieldError("arriveBy");
            }}
            error={fieldErrors.arriveBy}
            placeholder="8:30 AM"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label="Leave at"
            value={leaveAt}
            onChangeText={(value) => {
              setLeaveAt(value);
              clearFieldError("leaveAt");
            }}
            error={fieldErrors.leaveAt}
            placeholder="5:15 PM"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
      </View>
    </FormScreen>
  );
}

// Under the address field: who sees what, and the old free-text area if the
// student hasn't replaced it with an address yet.
function addressHint(profile: Profile, picked: AddressSuggestion | null): string {
  const area = picked?.area ?? (profile.homeAddress ? profile.homeArea : null);
  if (area) {
    return `Only you see your full address. Other students only see "${area}".`;
  }
  if (profile.homeArea) {
    return `You entered "${profile.homeArea}" before. Search for your address to replace it. Only you see the full address.`;
  }
  return "Only you see your full address. Other students only see your neighbourhood.";
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    field: {
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    campus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      padding: 14,
    },
    campusSelected: {
      borderColor: colors.primary,
    },
    campusText: {
      flex: 1,
      gap: 2,
    },
    campusName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    campusAddress: {
      color: colors.textMuted,
      fontSize: 13,
    },
    pressed: {
      opacity: 0.6,
    },
    error: {
      color: colors.error,
      fontSize: 13,
      fontWeight: "500",
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    flex: {
      flex: 1,
    },
  });
}
