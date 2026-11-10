import { useState, type ReactNode } from "react";
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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, type Profile } from "@/lib/api";
import { useProfile } from "@/lib/profile";

// Layout for a profile edit screen: an intro line, the form, an error box and a
// Save button. The screen's title and back button come from the Stack header.
export function FormScreen({
  intro,
  children,
  saveLabel = "Save",
  destructive = false,
  saving,
  formError,
  onSave,
  footer,
}: {
  intro?: string;
  children: ReactNode;
  saveLabel?: string;
  destructive?: boolean;
  saving: boolean;
  formError: string | null;
  onSave: () => void;
  footer?: ReactNode;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {intro ? <Text style={styles.intro}>{intro}</Text> : null}

          <View style={styles.card}>{children}</View>

          {formError ? (
            <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.button,
              destructive && styles.buttonDestructive,
              pressed && styles.buttonPressed,
              saving && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>{saveLabel}</Text>
            )}
          </Pressable>

          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Handles saving for an edit screen: runs the save, puts a server error under
// the field it names (or in the error box), and goes back when it succeeds.
export function useSaveHandler<Field extends string>(fields: readonly Field[]) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

  async function save(
    localErrors: Partial<Record<Field, string>>,
    action: () => Promise<void>,
    { goBack = true }: { goBack?: boolean } = {},
  ) {
    if (saving) return false;
    setFieldErrors(localErrors);
    setFormError(null);
    if (Object.values(localErrors).some(Boolean)) return false;

    setSaving(true);
    try {
      await action();
      if (goBack) {
        // Opened directly (e.g. a refresh on web) there's nothing to go back to.
        if (router.canGoBack()) router.back();
        else router.replace("/profile");
      }
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.field && fields.includes(error.field as Field)) {
        setFieldErrors({ [error.field]: error.message } as Partial<Record<Field, string>>);
      } else {
        setFormError(error instanceof ApiError ? error.message : "Something went wrong. Try again.");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  function clearFieldError(field: Field) {
    setFieldErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
  }

  return { saving, formError, fieldErrors, save, clearFieldError };
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
    content: {
      padding: 20,
      gap: 20,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    intro: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 21,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
      gap: 18,
    },
    errorBox: {
      backgroundColor: colors.errorBackground,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDestructive: {
      backgroundColor: colors.error,
    },
    buttonPressed: {
      opacity: 0.85,
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

// Renders `children` once the profile has loaded, and a spinner until then.
// Edit screens can open before the profile tab has loaded it (e.g. after a refresh on web).
export function WithProfile({ children }: { children: (profile: Profile) => ReactNode }) {
  const colors = useThemeColors();
  const { profile } = useProfile();
  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return children(profile);
}
