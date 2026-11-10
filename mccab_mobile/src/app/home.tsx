import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "@/constants/theme";
import { useSession } from "@/lib/session";
import { createAuthStyles } from "@/styles/auth";

// Placeholder home screen until the real one is built.
export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);
  const { session, signOut } = useSession();

  const roleLabel = session?.role === "rider_driver" ? "Rider & Driver" : "Rider";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} accessibilityRole="header">
              Hi, {session?.user.name}
            </Text>
            <Text style={styles.subtitle}>You're using MCCab as a {roleLabel}.</Text>
            <Text style={styles.subtitle}>The home page is coming soon.</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={signOut}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
