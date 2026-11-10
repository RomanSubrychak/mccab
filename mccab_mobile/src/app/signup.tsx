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
import { SCHOOL_EMAIL_DOMAIN, SCHOOL_EMAIL_EXAMPLE, isSchoolEmail } from "@/constants/school";
import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, register } from "@/lib/api";
import { createAuthStyles } from "@/styles/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function SignUpScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const local = createLocalStyles(colors);
  const insets = useSafeAreaInsets();

  const nameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  function goToLogin() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }

  function validate(trimmedName: string, trimmedEmail: string): FieldErrors {
    const errors: FieldErrors = {};
    if (trimmedName.length === 0) {
      errors.name = "Enter your name.";
    }
    if (trimmedEmail.length === 0) {
      errors.email = "Enter your school email.";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = `Enter a valid email address, like ${SCHOOL_EMAIL_EXAMPLE}.`;
    } else if (!isSchoolEmail(trimmedEmail)) {
      // Same message as the server, which checks this too. It doesn't name the
      // allowed domain on purpose.
      errors.email = "Use your school email address.";
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

  function focusFirstError(errors: FieldErrors) {
    if (errors.name) nameRef.current?.focus();
    else if (errors.email) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
    else if (errors.confirmPassword) confirmRef.current?.focus();
  }

  async function handleSubmit() {
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const errors = validate(trimmedName, trimmedEmail);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await register(trimmedName, trimmedEmail, password);
      // Token storage waits until there is a home screen to open.
      setCreatedName(result.user.name);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors({ email: err.message });
        emailRef.current?.focus();
      } else if (err instanceof ApiError && isPasswordProblem(err.message)) {
        setFieldErrors({ password: err.message });
        passwordRef.current?.focus();
      } else if (err instanceof ApiError && isEmailProblem(err.message)) {
        setFieldErrors({ email: err.message });
        emailRef.current?.focus();
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
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
            <Text style={styles.tagline}>Create an account to start sharing rides</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} accessibilityRole="header">
                Sign up
              </Text>
              <Text style={styles.subtitle}>Use your @{SCHOOL_EMAIL_DOMAIN} email. It only takes a minute.</Text>
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

            {createdName ? (
              <>
                <View style={styles.successBox} accessibilityLiveRegion="polite">
                  <Text style={styles.successText}>Account created for {createdName}.</Text>
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
                    ref={nameRef}
                    label="Full name"
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    error={fieldErrors.name}
                    placeholder="Your name"
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    editable={!submitting}
                  />

                  <TextField
                    ref={emailRef}
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
                  accessibilityLabel={submitting ? "Creating account" : "Create account"}
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                >
                  {submitting ? (
                    <View style={local.buttonBusy}>
                      <ActivityIndicator color={colors.onPrimary} size="small" />
                      <Text style={styles.buttonText}>Creating account…</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Create account</Text>
                  )}
                </Pressable>

                <View style={styles.divider} />

                <View style={[styles.footer, styles.footerInCard]}>
                  <Text style={styles.footerText}>Already have an account?</Text>
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

function isPasswordProblem(message: string): boolean {
  return /password|guess/i.test(message);
}

function isEmailProblem(message: string): boolean {
  return /email/i.test(message);
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
