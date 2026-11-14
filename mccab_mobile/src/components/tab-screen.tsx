import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors, type Colors } from "@/constants/theme";

// Layout for a tab: a large title and scrolling content.
export function TabScreen({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const styles = createStyles(useThemeColors());
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerRight}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// A plain card for messages like "coming soon".
export function InfoCard({ title, children }: { title: string; children?: ReactNode }) {
  const styles = createStyles(useThemeColors());
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      gap: 24,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    subtitle: {
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
      gap: 8,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
    },
  });
}
