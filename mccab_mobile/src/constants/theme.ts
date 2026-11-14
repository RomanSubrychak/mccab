import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";

import { getStorageItemAsync, setStorageItemAsync } from "@/lib/storage";

const THEME_KEY = "mccab.theme";

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

// The preference is saved, so it survives app restarts.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isHydrated = useIsHydrated();
  // On web the HTML is rendered on the server, which can't know the browser's
  // color scheme and renders light. Use light until hydration finishes so the
  // first client render matches the server HTML, then switch to the real scheme.
  const systemScheme = isHydrated && colorScheme === "dark" ? "dark" : "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    getStorageItemAsync(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setPreferenceState(saved);
      }
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    setStorageItemAsync(THEME_KEY, next);
  };

  const scheme: ColorScheme = preference === "system" ? systemScheme : preference;

  const value: ThemeContextValue = {
    scheme,
    preference,
    setPreference,
    toggleScheme: () => setPreference(scheme === "dark" ? "light" : "dark"),
  };

  return createElement(ThemeContext.Provider, { value }, children);
}

// Native apps have no server render, so they are hydrated from the first render.
function useIsHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(Platform.OS !== "web");
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  return isHydrated;
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
