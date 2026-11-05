import { Pressable, StyleSheet, View } from "react-native";

import { useTheme, useThemeColors, type Colors } from "@/constants/theme";

const ICON_SIZE = 18;
const RAY_COUNT = 8;

// Round button that switches between light and dark mode.
// Shows a moon in light mode (tap for dark) and a sun in dark mode (tap for light).
export function ThemeToggle() {
  const { scheme, toggleScheme } = useTheme();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const isDark = scheme === "dark";

  return (
    <Pressable
      onPress={toggleScheme}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
      hitSlop={6}
    >
      {isDark ? <SunIcon styles={styles} /> : <MoonIcon styles={styles} />}
    </Pressable>
  );
}

type Styles = ReturnType<typeof createStyles>;

function MoonIcon({ styles }: { styles: Styles }) {
  // A filled circle with an offset circle in the button's color cut out of it.
  return (
    <View style={styles.icon}>
      <View style={styles.moonDisc} />
      <View style={styles.moonCutout} />
    </View>
  );
}

function SunIcon({ styles }: { styles: Styles }) {
  return (
    <View style={styles.icon}>
      {Array.from({ length: RAY_COUNT }, (_, index) => (
        <View
          key={index}
          style={[styles.rayTrack, { transform: [{ rotate: `${(360 / RAY_COUNT) * index}deg` }] }]}
        >
          <View style={styles.ray} />
        </View>
      ))}
      <View style={styles.sunDisc} />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    button: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
    },
    buttonPressed: {
      opacity: 0.7,
    },
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },

    // Moon
    moonDisc: {
      width: ICON_SIZE - 2,
      height: ICON_SIZE - 2,
      borderRadius: ICON_SIZE,
      backgroundColor: colors.text,
    },
    moonCutout: {
      position: "absolute",
      width: ICON_SIZE - 4,
      height: ICON_SIZE - 4,
      borderRadius: ICON_SIZE,
      backgroundColor: colors.card,
      top: -2,
      right: -2,
    },

    // Sun
    sunDisc: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.text,
    },
    rayTrack: {
      position: "absolute",
      width: 2,
      height: ICON_SIZE,
      alignItems: "center",
    },
    ray: {
      width: 2,
      height: 3,
      borderRadius: 1,
      backgroundColor: colors.text,
    },
  });
}
