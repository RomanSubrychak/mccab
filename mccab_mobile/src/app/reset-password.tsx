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
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TextField } from "@/components/text-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, resetPassword } from "@/lib/api";
import { createAuthStyles } from "@/styles/auth";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

type FieldErrors = {
  token?: string;
  password?: string;
  confirmPassword?: string;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const local = createLocalStyles(colors);
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const [token, setToken] = useState(firstParam(params.token));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function goToLogin() {
    router.replace("/login");
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (token.trim().length === 0) {
      errors.token = "Enter the reset code.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    } else if (password.length > MAX_PASSWORD_LENGTH) {
      errors.password = `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
    }
    if (confirmPassword.length === 0) {
      errors.confirmPassword = "Repeat your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords don't match.";
    }
    return errors;
  }

  async function handleSubmit() {
    if (submitting) return;

    const errors = validate();
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      if (errors.password) passwordRef.current?.focus();
      else if (errors.confirmPassword) confirmRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token.trim(), password);
      setDone(true);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError("Something went wrong. Try again.");
      } else if (/password|guess/i.test(err.message)) {
        setFieldErrors({ password: err.message });
        passwordRef.current?.focus();
      } else if (/code|expired|invalid/i.test(err.message)) {
        setFieldErrors({ token: err.message });
      } else {
        setFormError(err.message);
      }
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
                Choose a new password
              </Text>
              {!done ? (
                <Text style={styles.subtitle}>
                  Paste the code from the server terminal, then choose a new password.
                </Text>
              ) : null}
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

            {done ? (
              <>
                <View style={styles.successBox} accessibilityLiveRegion="polite">
                  <Text style={styles.successText}>Your password has been updated.</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                  onPress={goToLogin}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>Sign in</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.form}>
                  <TextField
                    label="Reset code"
                    value={token}
                    onChangeText={(value) => {
                      setToken(value);
                      if (fieldErrors.token) setFieldErrors((prev) => ({ ...prev, token: undefined }));
                    }}
                    error={fieldErrors.token}
                    placeholder="Paste the code"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!submitting}
                  />

                  <TextField
                    ref={passwordRef}
                    label="New password"
                    password
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    error={fieldErrors.password}
                    hint={`At least ${MIN_PASSWORD_LENGTH} characters. Longer phrases work best.`}
                    placeholder="Create a password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    editable={!submitting}
                  />

                  <TextField
                    ref={confirmRef}
                    label="Confirm password"
                    password
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    error={fieldErrors.confirmPassword}
                    placeholder="Repeat your password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                    editable={!submitting}
                  />
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
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                >
                  {submitting ? (
                    <View style={local.buttonBusy}>
                      <ActivityIndicator color={colors.onPrimary} size="small" />
                      <Text style={styles.buttonText}>Updating…</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Update password</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createLocalStyles(colors: Colors) {
  return StyleSheet.create({
    topBar: {
      position: "absolute",
      right: 16,
      zIndex: 1,
    },
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
