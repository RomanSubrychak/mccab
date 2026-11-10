import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemeProvider, useTheme, useThemeColors } from "@/constants/theme";
import { SessionProvider, useSession } from "@/lib/session";

// Keep the splash screen up until the saved login token has been read, so a
// signed-in user doesn't see the login screen flash first.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SplashScreenController />
        <ThemedStack />
      </ThemeProvider>
    </SessionProvider>
  );
}

function SplashScreenController() {
  const { isLoading } = useSession();
  if (!isLoading) {
    SplashScreen.hide();
  }
  return null;
}

function ThemedStack() {
  const { scheme } = useTheme();
  const colors = useThemeColors();
  const { token } = useSession();
  const signedIn = Boolean(token);

  return (
    <>
      {/* Light icons on the dark theme, dark icons on the light theme. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Signed in: the app. Expo Router sends signed-out users to the first screen they can see. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        {/* Signed out: login and account recovery. */}
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
