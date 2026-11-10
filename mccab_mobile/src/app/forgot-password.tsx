import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TextField } from "@/components/text-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { SCHOOL_EMAIL_EXAMPLE } from "@/constants/school";
import { useThemeColors } from "@/constants/theme";
import { ApiError, requestPasswordReset } from "@/lib/api";
import { createAuthStyles } from "@/styles/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const local = createLocalStyles();
  const insets = useSafeAreaInsets();

  // The login screen passes along whatever email was already typed.
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function goToLogin() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }

  async function handleSubmit() {
    if (submitting) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length === 0) {
      setError("Enter your school email.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError(`Enter a valid email address, like ${SCHOOL_EMAIL_EXAMPLE}.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(trimmedEmail);
      setSentTo(trimmedEmail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[local.topBar, { top: insets.top + 12 }]}>
        <ThemeToggle />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={styles.appName} accessibilityRole="header">
              MCCab
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} accessibilityRole="header">
                Reset your password
              </Text>
            </View>

            {sentTo ? (
              <>
                {/* Same message whether or not the account exists, so emails can't be probed. */}
                <View style={styles.successBox} accessibilityLiveRegion="polite">
                  <Text style={styles.successText}>
                    If an account exists for {sentTo}, a reset code was printed in the server
                    terminal. It expires in 15 minutes.
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                  onPress={() => router.push("/reset-password")}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>Enter reset code</Text>
                </Pressable>
                <Pressable
                  onPress={goToLogin}
                  accessibilityRole="link"
                  hitSlop={8}
                  style={local.secondaryLink}
                >
                  {({ pressed }) => (
                    <Text style={[styles.inlineLink, pressed && styles.linkPressed]}>
                      Back to sign in
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Enter your school email. If an account exists, the server terminal prints a code
                  you can use to choose a new password.
                </Text>

                <TextField
                  label="School email"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError(null);
                  }}
                  error={error}
                  placeholder={SCHOOL_EMAIL_EXAMPLE}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                  editable={!submitting}
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    submitting && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                >
                  {submitting ? (
                    <View style={local.buttonBusy}>
                      <ActivityIndicator color={colors.onPrimary} size="small" />
                      <Text style={styles.buttonText}>Sending…</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Get reset code</Text>
                  )}
                </Pressable>

                <View style={styles.divider} />

                <View style={[styles.footer, styles.footerInCard]}>
                  <Text style={styles.footerText}>Remembered it?</Text>
                  <Pressable
                    style={styles.footerLinkHit}
                    onPress={goToLogin}
                    accessibilityRole="link"
                    disabled={submitting}
                  >
                    {({ pressed }) => (
                      <Text style={[styles.footerLink, pressed && styles.linkPressed]}>Sign in</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createLocalStyles() {
  return StyleSheet.create({
    topBar: {
      position: "absolute",
      right: 16,
      zIndex: 1,
    },
    buttonBusy: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    secondaryLink: {
      alignSelf: "center",
      paddingVertical: 4,
    },
  });
}
