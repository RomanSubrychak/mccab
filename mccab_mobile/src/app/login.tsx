import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TextField } from "@/components/text-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { SCHOOL_EMAIL_EXAMPLE } from "@/constants/school";
import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, login } from "@/lib/api";
import { useSession } from "@/lib/session";
import { createAuthStyles } from "@/styles/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const local = createLocalStyles(colors);
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();

  const passwordRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validate(trimmedEmail: string): FieldErrors {
    const errors: FieldErrors = {};
    if (trimmedEmail.length === 0) {
      errors.email = "Enter your school email.";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = `Enter a valid email address, like ${SCHOOL_EMAIL_EXAMPLE}.`;
    }
    if (password.length === 0) {
      errors.password = "Enter your password.";
    }
    return errors;
  }

  async function handleSubmit() {
    if (submitting) return;

    const trimmedEmail = email.trim().toLowerCase();
    const errors = validate(trimmedEmail);
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email) return;
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(trimmedEmail, password);
      // Saving the token switches to the signed-in screens: the terms, the role
      // choice or the tabs, depending on how far the student got (see (app)/_layout.tsx).
      signIn(result.token);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, local.root]}>
      {/* Decorative background shapes, tinted from the primary color. */}
      <View style={[local.blob, local.blobTop]} />
      <View style={[local.blob, local.blobBottom]} />

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
            <Text style={styles.tagline}>Share rides to campus with fellow students</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} accessibilityRole="header">
                Welcome back
              </Text>
              <Text style={styles.subtitle}>Sign in to find or offer your next ride.</Text>
            </View>

            {formError ? (
              <View
                style={styles.errorBox}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <View style={local.errorIcon}>
                  <Text style={local.errorIconText}>!</Text>
                </View>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}


            <View style={styles.form}>
              <TextField
                label="School email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={fieldErrors.email}
                placeholder={SCHOOL_EMAIL_EXAMPLE}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!submitting}
              />

              <View>
                <TextField
                  ref={passwordRef}
                  label="Password"
                  password
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  error={fieldErrors.password}
                  placeholder="Enter your password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  editable={!submitting}
                />
                <Pressable
                  style={styles.forgotLink}
                  onPress={() =>
                    router.push({
                      pathname: "/forgot-password",
                      params: { email: email.trim() },
                    })
                  }
                  accessibilityRole="link"
                  disabled={submitting}
                >
                  {({ pressed }) => (
                    <Text style={[styles.inlineLink, pressed && styles.linkPressed]}>
                      Forgot password?
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={submitting ? "Signing in" : "Sign in"}
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              {submitting ? (
                <View style={local.buttonBusy}>
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                  <Text style={styles.buttonText}>Signing in…</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>

            <View style={styles.divider} />

            <View style={[styles.footer, styles.footerInCard]}>
              <Text style={styles.footerText}>Don&apos;t have an account?</Text>
              <Pressable
                style={styles.footerLinkHit}
                onPress={() => router.push("/signup")}
                accessibilityRole="link"
                disabled={submitting}
              >
                {({ pressed }) => (
                  <Text style={[styles.footerLink, pressed && styles.linkPressed]}>Sign up</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles only the sign-in screen uses. Every color comes from the theme palette.
function createLocalStyles(colors: Colors) {
  return StyleSheet.create({
    root: {
      overflow: "hidden",
    },
    topBar: {
      position: "absolute",
      // `top` is set inline from the safe-area inset so it clears the notch.
      right: 16,
      zIndex: 1,
    },

    // Background
    blob: {
      position: "absolute",
      borderRadius: 9999,
      backgroundColor: colors.primary,
      opacity: 0.07,
      pointerEvents: "none",
    },
    blobTop: {
      width: 360,
      height: 360,
      top: -180,
      right: -120,
    },
    blobBottom: {
      width: 280,
      height: 280,
      bottom: -140,
      left: -120,
    },

    // Form details
    errorIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.error,
      alignItems: "center",
      justifyContent: "center",
    },
    errorIconText: {
      color: colors.errorBackground,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 16,
    },
    buttonBusy: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
  });
}
