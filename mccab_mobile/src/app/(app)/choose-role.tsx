import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors, type Colors } from "@/constants/theme";
import { RIDE_ROLES, type RideRole } from "@/constants/profile-options";
import { ApiError } from "@/lib/api";
import { firstName as getFirstName } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { createAuthStyles } from "@/styles/auth";

// The same two roles as everywhere else in the app (constants/profile-options.ts).
const ROLE_OPTIONS = RIDE_ROLES.map((option) => ({
  role: option.value,
  emoji: option.emoji,
  title: option.label,
  description: option.description,
}));

// Splash page shown once after sign-in: the student picks how they will use MCCab.
export default function ChooseRoleScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const local = createLocalStyles(colors);
  const { profile, update } = useProfile();

  const [selected, setSelected] = useState<RideRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = profile ? getFirstName(profile.name) : "";

  // Saved on the server. Once chosen, the app moves on to the tabs (see (app)/_layout.tsx).
  // The student can change it later in Profile > About me.
  async function handleContinue() {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await update({ rideRole: selected });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.appName} accessibilityRole="header">
            Welcome{firstName ? `, ${firstName}` : ""}!
          </Text>
          <Text style={styles.tagline}>How do you want to use MCCab?</Text>
        </View>

        <View style={local.options} accessibilityRole="radiogroup">
          {ROLE_OPTIONS.map((option) => {
            const isSelected = selected === option.role;
            return (
              <Pressable
                key={option.role}
                style={({ pressed }) => [
                  local.option,
                  isSelected && local.optionSelected,
                  pressed && local.optionPressed,
                ]}
                onPress={() => setSelected(option.role)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${option.title}. ${option.description}`}
              >
                <View style={[local.iconCircle, isSelected && local.iconCircleSelected]}>
                  <Text style={local.emoji}>{option.emoji}</Text>
                </View>
                <View style={local.optionText}>
                  <Text style={local.optionTitle}>{option.title}</Text>
                  <Text style={local.optionDescription}>{option.description}</Text>
                </View>
                <View style={[local.radio, isSelected && local.radioSelected]}>
                  {isSelected ? <View style={local.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            local.continueButton,
            pressed && selected && styles.buttonPressed,
            !selected && local.buttonInactive,
          ]}
          onPress={handleContinue}
          disabled={!selected || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected || saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>

        {error ? (
          <Text style={local.errorText} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createLocalStyles(colors: Colors) {
  return StyleSheet.create({
    options: {
      gap: 14,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.border,
      padding: 18,
    },
    optionSelected: {
      borderColor: colors.primary,
      boxShadow: `0 0 0 4px ${colors.primary}1F`,
    },
    optionPressed: {
      transform: [{ scale: 0.99 }],
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircleSelected: {
      backgroundColor: `${colors.primary}1A`,
    },
    emoji: {
      fontSize: 28,
    },
    optionText: {
      flex: 1,
      gap: 4,
    },
    optionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    optionDescription: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: "500",
      textAlign: "center",
      marginTop: 12,
    },
    continueButton: {
      marginTop: 28,
    },
    buttonInactive: {
      opacity: 0.45,
      boxShadow: "none",
    },
  });
}
