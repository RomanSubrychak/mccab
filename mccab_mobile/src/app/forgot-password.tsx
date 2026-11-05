import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "@/constants/theme";
import { ApiError, requestPasswordReset } from "@/lib/api";
import { createAuthStyles } from "@/styles/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);

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
    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address.");
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
            <Text style={styles.appName}>MCCab</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Reset your password</Text>

            {sentTo ? (
              <>
                {/* Same message whether or not the account exists, so emails can't be probed. */}
                <Text style={styles.successText}>
                  If an account exists for {sentTo}, we sent a link to reset your password.
                  Check your inbox and spam folder.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                  onPress={goToLogin}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>Back to sign in</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.hint}>
                  Enter your school email and we&apos;ll send you a link to reset your password.
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>School email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@school.edu"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                    editable={!submitting}
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox} accessibilityRole="alert">
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

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
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>Send reset link</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>

          {sentTo ? null : (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remembered it?</Text>
              <Pressable
                onPress={goToLogin}
                accessibilityRole="link"
                hitSlop={8}
                disabled={submitting}
              >
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
