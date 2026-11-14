import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { TextField } from "@/components/text-field";
import { useThemeColors } from "@/constants/theme";
import { ApiError, resendVerification, verifyEmail } from "@/lib/api";
import { useSession } from "@/lib/session";
import { createAuthStyles } from "@/styles/auth";

const CODE_LENGTH = 6;
// Matches the server's resend cooldown.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const { signIn } = useSession();

  // The sign up screen sets emailSent to "1" or "0". The login screen leaves it
  // out: that user may have no valid code, so they can resend right away.
  const { email = "", emailSent } = useLocalSearchParams<{
    email?: string;
    emailSent?: string;
  }>();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(
    emailSent === "0" ? "We couldn't send the email. Wait a minute, then tap Resend code." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(emailSent ? RESEND_COOLDOWN_SECONDS : 0);

  const counting = cooldown > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  async function handleVerify() {
    if (submitting) return;
    if (code.length !== CODE_LENGTH) {
      setNotice(null);
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`);
      return;
    }

    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await verifyEmail(email, code);
      // Saving the token signs the student in and switches to the signed-in
      // screens: the terms, then the role choice (see (app)/_layout.tsx).
      signIn(result.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resending || cooldown > 0) return;

    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await resendVerification(email);
      setCode("");
      setNotice("We sent a new code. Earlier codes no longer work.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setResending(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
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
            <View style={styles.cardHeader}>
              <Text style={styles.title} accessibilityRole="header">
                Check your email
              </Text>
              <Text style={styles.subtitle}>
                Enter the {CODE_LENGTH}-digit code we sent to {email}. It expires after 15 minutes.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {notice ? (
              <View style={styles.successBox} accessibilityLiveRegion="polite">
                <Text style={styles.successText}>{notice}</Text>
              </View>
            ) : null}

            <TextField
              label="Verification code"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
              placeholder="123456"
              maxLength={CODE_LENGTH}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="go"
              onSubmitEditing={handleVerify}
              editable={!submitting}
            />

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Verify email</Text>
              )}
            </Pressable>

            <View style={[styles.footer, styles.footerInCard]}>
              <Text style={styles.footerText}>Didn&apos;t get it?</Text>
              {cooldown > 0 ? (
                <Text style={styles.footerText}>Resend in {cooldown}s</Text>
              ) : (
                <Pressable
                  style={styles.footerLinkHit}
                  onPress={handleResend}
                  disabled={resending}
                  accessibilityRole="button"
                >
                  {({ pressed }) => (
                    <Text style={[styles.footerLink, pressed && styles.linkPressed]}>
                      {resending ? "Sending…" : "Resend code"}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => router.replace("/login")}
              accessibilityRole="link"
              hitSlop={8}
              disabled={submitting}
            >
              <Text style={styles.footerLink}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
