import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import { US_STATES } from "@/constants/profile-options";
import { useThemeColors } from "@/constants/theme";
import type { Profile } from "@/lib/api";
import { formatDate, parseDate } from "@/lib/format";
import { useProfile } from "@/lib/profile";

const FIELDS = ["state", "last4", "expiresOn"] as const;
type Field = (typeof FIELDS)[number];

export default function LicenceScreen() {
  return <WithProfile>{(profile) => <LicenceForm profile={profile} />}</WithProfile>;
}

function LicenceForm({ profile }: { profile: Profile }) {
  const colors = useThemeColors();
  const { saveLicence, removeLicence } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);
  const licence = profile.licence;

  const [state, setState] = useState(licence?.state ?? "IL");
  const [last4, setLast4] = useState(licence?.last4 ?? "");
  const [expiresOn, setExpiresOn] = useState(formatDate(licence?.expiresOn ?? null) ?? "");

  function handleSave() {
    const errors: Partial<Record<Field, string>> = {};
    const stateCode = state.trim().toUpperCase();
    const date = parseDate(expiresOn);
    if (!US_STATES.includes(stateCode)) errors.state = "Enter the two-letter state, like IL.";
    if (!/^[A-Za-z0-9]{4}$/.test(last4.trim())) errors.last4 = "Enter the last 4 letters or digits.";
    if (!date) errors.expiresOn = "Enter the expiration date, like 05/31/2028.";

    // The server also rejects an expired licence.
    save(errors, () =>
      saveLicence({ state: stateCode, last4: last4.trim().toUpperCase(), expiresOn: date! }),
    );
  }

  function field(name: Field, setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      clearFieldError(name);
    };
  }

  return (
    <FormScreen
      intro="You need a valid driver's licence to offer rides. We only keep the last 4 characters of the number, and riders only see that you have a licence on file."
      saveLabel={licence ? "Save" : "Add licence"}
      saving={saving}
      formError={formError}
      onSave={handleSave}
      footer={
        licence ? (
          <Pressable
            onPress={() => save({}, removeLicence)}
            disabled={saving}
            accessibilityRole="button"
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={[styles.removeText, { color: colors.error }]}>Remove licence</Text>
          </Pressable>
        ) : null
      }
    >
      <TextField
        label="Issuing state"
        value={state}
        onChangeText={field("state", setState)}
        error={fieldErrors.state}
        placeholder="IL"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={2}
      />
      <TextField
        label="Last 4 of licence number"
        value={last4}
        onChangeText={field("last4", setLast4)}
        error={fieldErrors.last4}
        hint="Only the last 4. Never enter your full licence number."
        placeholder="1234"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={4}
      />
      <TextField
        label="Expiration date"
        value={expiresOn}
        onChangeText={field("expiresOn", setExpiresOn)}
        error={fieldErrors.expiresOn}
        placeholder="MM/DD/YYYY"
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
        maxLength={10}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  remove: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  removeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
});
