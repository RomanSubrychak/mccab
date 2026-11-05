import { createContext, createElement, useContext, useState, type ReactNode } from "react";
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
export type ColorScheme = "light" | "dark";
// "system" follows the phone's setting; "light" and "dark" override it.
export type ThemePreference = "system" | ColorScheme;

type ThemeContextValue = {
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// TODO: persist the preference (e.g. with AsyncStorage) so it survives app restarts.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme() === "dark" ? "dark" : "light";
  const [preference, setPreference] = useState<ThemePreference>("system");

  const scheme: ColorScheme = preference === "system" ? systemScheme : preference;

  const value: ThemeContextValue = {
    scheme,
    preference,
    setPreference,
    toggleScheme: () => setPreference(scheme === "dark" ? "light" : "dark"),
  };

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return context;
}

export function useThemeColors(): Colors {
  return palette[useTheme().scheme];
}
