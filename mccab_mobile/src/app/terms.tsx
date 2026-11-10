import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors, type Colors } from "@/constants/theme";
import { useSession } from "@/lib/session";
import { createAuthStyles } from "@/styles/auth";

// Placeholder text for the class project. Replace with real terms reviewed by the school
// before the app is used by anyone.
const TERMS_SECTIONS = [
  {
    title: "1. Who can use MCCab",
    body: "MCCab is for current students of our school only. You must sign up with your school email and keep your account details accurate. One account per student.",
  },
  {
    title: "2. Rides between students",
    body: "MCCab only connects students who want to share a ride to campus. MCCab is not a taxi or transport company and does not employ drivers. Each ride is an arrangement between the students in it.",
  },
  {
    title: "3. Drivers",
    body: "If you offer rides, you must hold a valid driver's license, have insurance for your car, and follow all traffic laws. You may only ask riders to share the cost of the trip, not to make a profit.",
  },
  {
    title: "4. Riders",
    body: "Be on time at the pickup point, wear your seatbelt, and pay the agreed share of the trip. Cancel in the app as early as you can if your plans change.",
  },
  {
    title: "5. Safety and behavior",
    body: "Treat everyone with respect. Harassment, discrimination, or unsafe behavior will get your account removed. Report any problem to the MCCab team right away. In an emergency, call your local emergency number first.",
  },
  {
    title: "6. Payments",
    body: "Payments are agreed between riders and drivers. MCCab does not hold money or give refunds at this stage of the project.",
  },
  {
    title: "7. Your data",
    body: "We store your name, school email, and ride history to run the app. We never sell your data. You can ask us to delete your account at any time.",
  },
  {
    title: "8. Changes to these terms",
    body: "We may update these terms as the app grows. We will ask you to agree again when they change.",
  },
];

export default function TermsScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const local = createLocalStyles(colors);
  const { acceptTerms, signOut } = useSession();

  const [agreed, setAgreed] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={local.container}>
        <View style={local.header}>
          <Text style={styles.title} accessibilityRole="header">
            Terms and Conditions
          </Text>
          <Text style={styles.subtitle}>
            Please read and agree to these terms before you use MCCab.
          </Text>
        </View>

        <ScrollView
          style={local.termsBox}
          contentContainerStyle={local.termsContent}
          accessibilityLabel="Terms and Conditions text"
        >
          <Text style={local.sampleNote}>Sample terms for the MCCab class project.</Text>
          {TERMS_SECTIONS.map((section) => (
            <View key={section.title} style={local.section}>
              <Text style={local.sectionTitle}>{section.title}</Text>
              <Text style={local.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={local.actions}>
          <Pressable
            style={local.checkboxRow}
            onPress={() => setAgreed((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[local.checkbox, agreed && local.checkboxChecked]}>
              {agreed ? <Text style={local.checkmark}>✓</Text> : null}
            </View>
            <Text style={local.checkboxLabel}>
              I have read and agree to the MCCab Terms and Conditions.
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && agreed && styles.buttonPressed,
              !agreed && local.buttonInactive,
            ]}
            onPress={acceptTerms}
            disabled={!agreed}
            accessibilityRole="button"
            accessibilityState={{ disabled: !agreed }}
          >
            <Text style={styles.buttonText}>Agree and continue</Text>
          </Pressable>

          <Pressable
            style={local.declineButton}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityHint="Signs you out. You need to agree to use the app."
          >
            {({ pressed }) => (
              <Text style={[local.declineText, pressed && styles.linkPressed]}>
                Decline and sign out
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createLocalStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 16,
      gap: 16,
    },
    header: {
      gap: 6,
    },
    termsBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    termsContent: {
      padding: 20,
      gap: 18,
    },
    sampleNote: {
      color: colors.textMuted,
      fontSize: 13,
      fontStyle: "italic",
    },
    section: {
      gap: 6,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    sectionBody: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    actions: {
      gap: 12,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 6,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 18,
    },
    checkboxLabel: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },
    buttonInactive: {
      opacity: 0.45,
      boxShadow: "none",
    },
    declineButton: {
      alignItems: "center",
      paddingVertical: 10,
    },
    declineText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
