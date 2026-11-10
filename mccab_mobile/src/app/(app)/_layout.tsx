import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

import { useThemeColors, type Colors } from "@/constants/theme";
import { ProfileProvider, useProfile } from "@/lib/profile";
import { useSession } from "@/lib/session";

// Everything a signed-in student sees. The profile (saved on the server) decides
// which screens are available, in the order a new student goes through them:
// the terms, then the role choice, then the tabs and the profile edit screens.
export default function AppLayout() {
  return (
    <ProfileProvider>
      <SignedInStack />
    </ProfileProvider>
  );
}

function SignedInStack() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { profile, loadError, reload } = useProfile();
  const { signOut } = useSession();

  // The steps depend on the profile, so wait for it before showing any screen.
  if (!profile) {
    return (
      <View style={styles.centered}>
        {loadError ? (
          <>
            <Text style={styles.message}>{loadError}</Text>
            <Pressable onPress={reload} accessibilityRole="button" style={styles.action}>
              <Text style={styles.link}>Try again</Text>
            </Pressable>
            <Pressable onPress={signOut} accessibilityRole="button" style={styles.action}>
              <Text style={styles.link}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  const termsAccepted = profile.termsAcceptedAt !== null;
  const hasRole = profile.rideRole !== null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!termsAccepted}>
        <Stack.Screen name="terms" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={termsAccepted && !hasRole}>
        <Stack.Screen name="choose-role" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={termsAccepted && hasRole}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/about" options={{ title: "About me" }} />
        <Stack.Screen name="settings/car" options={{ title: "My car" }} />
        <Stack.Screen name="settings/route" options={{ title: "My route" }} />
        <Stack.Screen name="settings/preferences" options={{ title: "Ride preferences" }} />
        <Stack.Screen name="settings/safety" options={{ title: "Safety" }} />
        <Stack.Screen name="settings/password" options={{ title: "Change password" }} />
        <Stack.Screen name="settings/delete-account" options={{ title: "Delete account" }} />
      </Stack.Protected>
    </Stack>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 24,
      backgroundColor: colors.background,
    },
    message: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: "center",
      marginBottom: 8,
    },
    action: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
