import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import { useThemeColors } from "@/constants/theme";
import type { Profile } from "@/lib/api";
import { formatDate, parseDate } from "@/lib/format";
import { useProfile } from "@/lib/profile";

const FIELDS = ["provider", "policyLast4", "expiresOn"] as const;
type Field = (typeof FIELDS)[number];

export default function InsuranceScreen() {
  return <WithProfile>{(profile) => <InsuranceForm profile={profile} />}</WithProfile>;
}

function InsuranceForm({ profile }: { profile: Profile }) {
  const colors = useThemeColors();
  const { saveInsurance, removeInsurance } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);
  const insurance = profile.insurance;

  const [provider, setProvider] = useState(insurance?.provider ?? "");
  const [policyLast4, setPolicyLast4] = useState(insurance?.policyLast4 ?? "");
  const [expiresOn, setExpiresOn] = useState(formatDate(insurance?.expiresOn ?? null) ?? "");

  function handleSave() {
    const errors: Partial<Record<Field, string>> = {};
    const date = parseDate(expiresOn);
    if (!provider.trim()) errors.provider = "Enter your insurance company.";
    if (policyLast4.trim() && !/^[A-Za-z0-9]{4}$/.test(policyLast4.trim())) {
      errors.policyLast4 = "Enter the last 4 letters or digits, or leave it empty.";
    }
    if (!date) errors.expiresOn = "Enter the expiration date, like 01/15/2027.";

    save(errors, () =>
      saveInsurance({
        provider: provider.trim(),
        policyLast4: policyLast4.trim() ? policyLast4.trim().toUpperCase() : null,
        expiresOn: date!,
      }),
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
      intro="Drivers must have insurance for the car they drive (see the Terms). We only keep the last 4 characters of the policy number. Riders only see that you have insurance on file."
      saveLabel={insurance ? "Save" : "Add insurance"}
      saving={saving}
      formError={formError}
      onSave={handleSave}
      footer={
        insurance ? (
          <Pressable
            onPress={() => save({}, removeInsurance)}
            disabled={saving}
            accessibilityRole="button"
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={[styles.removeText, { color: colors.error }]}>Remove insurance</Text>
          </Pressable>
        ) : null
      }
    >
      <TextField
        label="Insurance company"
        value={provider}
        onChangeText={field("provider", setProvider)}
        error={fieldErrors.provider}
        placeholder="State Farm"
        autoCapitalize="words"
      />
      <TextField
        label="Last 4 of policy number (optional)"
        value={policyLast4}
        onChangeText={field("policyLast4", setPolicyLast4)}
        error={fieldErrors.policyLast4}
        placeholder="1234"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={4}
      />
      <TextField
        label="Policy expiration date"
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
