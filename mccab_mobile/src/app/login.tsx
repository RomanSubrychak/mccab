import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, login, type AuthUser } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleSubmit() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await login(trimmedEmail, password);
      // TODO: store result.token securely and navigate to the home screen.
      setUser(result.user);
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
            <Text style={styles.tagline}>Share rides to campus with fellow students</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Log in</Text>

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
                returnKeyType="next"
                editable={!submitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  editable={!submitting}
                />
                <Pressable
                  style={styles.showButton}
                  onPress={() => setShowPassword((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  hitSlop={8}
                >
                  <Text style={styles.showButtonText}>{showPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {user ? (
              <Text style={styles.successText}>Logged in as {user.name}.</Text>
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
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 32,
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
    },
    brand: {
      alignItems: "center",
      marginBottom: 28,
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    logoText: {
      color: colors.onPrimary,
      fontSize: 32,
      fontWeight: "800",
    },
    appName: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "800",
    },
    tagline: {
      color: colors.textMuted,
      fontSize: 15,
      marginTop: 4,
      textAlign: "center",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
      gap: 16,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    field: {
      gap: 6,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      color: colors.text,
      fontSize: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
    },
    passwordRow: {
      justifyContent: "center",
    },
    passwordInput: {
      paddingRight: 68,
    },
    showButton: {
      position: "absolute",
      right: 12,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    showButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    errorBox: {
      backgroundColor: colors.errorBackground,
      borderRadius: 10,
      padding: 12,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
    },
    successText: {
      color: colors.text,
      fontSize: 14,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonPressed: {
      backgroundColor: colors.primaryPressed,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
