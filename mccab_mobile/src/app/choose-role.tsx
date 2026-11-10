import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors, type Colors } from "@/constants/theme";
import { useSession, type UserRole } from "@/lib/session";
import { createAuthStyles } from "@/styles/auth";

const ROLE_OPTIONS: { role: UserRole; emoji: string; title: string; description: string }[] = [
  {
    role: "rider",
    emoji: "🎒",
    title: "Rider",
    description: "Find a seat with a classmate who's already driving to campus.",
  },
  {
    role: "rider_driver",
    emoji: "🚗",
    title: "Rider & Driver",
    description: "Book seats when you need one, and offer rides in your own car to 2 or 3 students.",
  },
];

// Splash page shown once after sign-in: the student picks how they will use MCCab.
export default function ChooseRoleScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const local = createLocalStyles(colors);
  const { session, chooseRole } = useSession();

  const [selected, setSelected] = useState<UserRole | null>(null);
  const firstName = session?.user.name.split(" ")[0] ?? "";

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
          onPress={() => selected && chooseRole(selected)}
          disabled={!selected}
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected }}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
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
    continueButton: {
      marginTop: 28,
    },
    buttonInactive: {
      opacity: 0.45,
      boxShadow: "none",
    },
  });
}
