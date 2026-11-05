import { StyleSheet } from "react-native";

import type { Colors } from "@/constants/theme";

// Shared styles for the auth screens (sign in, sign up, forgot password).
// Spacing follows a 4pt scale: 4, 8, 12, 16, 20, 24, 32.
export function createAuthStyles(colors: Colors) {
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

    // Brand header
    brand: {
      alignItems: "center",
      marginBottom: 32,
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      boxShadow: `0 8px 20px ${colors.primary}40`,
    },
    logoText: {
      color: colors.onPrimary,
      fontSize: 36,
      fontWeight: "800",
    },
    appName: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    tagline: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 6,
      textAlign: "center",
    },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 24,
      paddingVertical: 28,
      gap: 20,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.08)",
    },
    cardHeader: {
      gap: 6,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 21,
    },
    form: {
      gap: 16,
    },

    // Plain field styles (used by screens that don't use <TextField> yet)
    field: {
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      borderWidth: 1.5,
      borderRadius: 12,
      color: colors.text,
      fontSize: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 52,
    },
    passwordRow: {
      justifyContent: "center",
    },
    passwordInput: {
      paddingRight: 72,
    },
    showButton: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      minWidth: 64,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    showButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },

    // Messages
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.errorBackground,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      overflow: "hidden",
    },
    errorText: {
      flexShrink: 1,
      color: colors.error,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
    },
    successBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    successText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },

    // Primary button
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 6px 16px ${colors.primary}33`,
    },
    buttonPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.99 }],
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.2,
    },

    // Links
    forgotLink: {
      alignSelf: "flex-end",
      // Taller touch target without adding visual space.
      paddingVertical: 10,
      marginBottom: -10,
      paddingLeft: 12,
    },
    inlineLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    linkPressed: {
      opacity: 0.6,
    },

    // Footer ("Don't have an account? Sign up")
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 20,
      gap: 4,
    },
    // Footer placed inside the card: the card's gap already spaces it.
    footerInCard: {
      marginTop: -4,
      marginBottom: -8,
    },
    footerText: {
      color: colors.textMuted,
      fontSize: 15,
    },
    footerLinkHit: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    footerLink: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
