import { useColorScheme } from "react-native";

const palette = {
  light: {
    background: "#F4F7FB",
    card: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#D7DEE8",
    inputBackground: "#FFFFFF",
    primary: "#D32F2F",
    primaryPressed: "#B71C1C",
    onPrimary: "#FFFFFF",
    error: "#C62828",
    errorBackground: "#FDECEC",
  },
  dark: {
    background: "#0B1220",
    card: "#131C2E",
    text: "#F1F5F9",
    textMuted: "#94A3B8",
    border: "#2A3650",
    inputBackground: "#0F1828",
    primary: "#EF5350",
    primaryPressed: "#E53935",
    onPrimary: "#FFFFFF",
    error: "#FF8A80",
    errorBackground: "#3A1A1D",
  },
};

export type Colors = typeof palette.light;

export function useThemeColors(): Colors {
  return useColorScheme() === "dark" ? palette.dark : palette.light;
}
