import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemeProvider, useTheme, useThemeColors } from "@/constants/theme";
import { SessionProvider, useSession } from "@/lib/session";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ThemedStack />
      </SessionProvider>
    </ThemeProvider>
  );
}

function ThemedStack() {
  const { scheme } = useTheme();
  const colors = useThemeColors();
  const { session } = useSession();

  const signedIn = session !== null;
  const termsAccepted = session?.termsAccepted ?? false;
  const hasRole = session?.role != null;

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
        {/* index redirects to the right screen for the session, so it is always available. */}
        <Stack.Screen name="index" />

        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>

        {/* Signed-in screens, in the order a new user goes through them. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Protected guard={!termsAccepted}>
            <Stack.Screen name="terms" />
          </Stack.Protected>
          <Stack.Protected guard={termsAccepted && !hasRole}>
            <Stack.Screen name="choose-role" />
          </Stack.Protected>
          <Stack.Protected guard={termsAccepted && hasRole}>
            <Stack.Screen name="home" />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
    </>
  );
}
