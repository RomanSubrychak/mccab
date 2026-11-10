import { Stack } from "expo-router";

import { useThemeColors } from "@/constants/theme";
import { ProfileProvider } from "@/lib/profile";

// Everything a signed-in student sees: the tabs, plus the profile edit screens
// that open on top of them with a back button.
export default function AppLayout() {
  const colors = useThemeColors();

  return (
    <ProfileProvider>
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/about" options={{ title: "About me" }} />
        <Stack.Screen name="settings/car" options={{ title: "My car" }} />
        <Stack.Screen name="settings/route" options={{ title: "My route" }} />
        <Stack.Screen name="settings/preferences" options={{ title: "Ride preferences" }} />
        <Stack.Screen name="settings/safety" options={{ title: "Safety" }} />
        <Stack.Screen name="settings/password" options={{ title: "Change password" }} />
        <Stack.Screen name="settings/delete-account" options={{ title: "Delete account" }} />
      </Stack>
    </ProfileProvider>
  );
}
