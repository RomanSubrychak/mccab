import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "@/constants/theme";
import { createAuthStyles } from "@/styles/auth";

// Placeholder: verified users land here. The rider/driver choice needs a role
// field on User, which the group hasn't decided on yet.
export default function RoleSelectionScreen() {
  const colors = useThemeColors();
  const styles = createAuthStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} accessibilityRole="header">
              Your email is verified
            </Text>
            <Text style={styles.subtitle}>Choosing a role is coming soon.</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
