import { useEffect, useEffectEvent, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { TextField } from "@/components/text-field";
import { useThemeColors, type Colors } from "@/constants/theme";
import { ApiError, type AddressSuggestion } from "@/lib/api";
import { useProfile } from "@/lib/profile";

// Wait this long after the last keystroke before searching.
const DEBOUNCE_MS = 300;
const MIN_LENGTH = 3;

type AddressFieldProps = {
  label: string;
  // The text in the input. The parent keeps it so it can tell a picked
  // address from text the student typed but didn't pick.
  value: string;
  onChangeText: (text: string) => void;
  // Called when the student picks a suggestion. value is set to its address.
  onSelect: (suggestion: AddressSuggestion) => void;
  error?: string | null;
  hint?: string;
  placeholder?: string;
};

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; suggestions: AddressSuggestion[] }
  | { status: "failed"; message: string };

// A text field that suggests real addresses as the student types (through
// GET /places/autocomplete). Only a picked suggestion counts as an address:
// the parent should refuse to save text that wasn't picked.
export function AddressField({
  label,
  value,
  onChangeText,
  onSelect,
  error,
  hint,
  placeholder,
}: AddressFieldProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { searchAddresses } = useProfile();

  // What to search for. Only typing sets it, so picking a suggestion (which
  // changes value) doesn't start a new search.
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });

  // The context function changes on every render; as an effect event it
  // doesn't restart the search below.
  const runSearch = useEffectEvent((text: string, signal: AbortSignal) =>
    searchAddresses(text, signal),
  );

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_LENGTH) {
      setSearch({ status: "idle" });
      return;
    }
    setSearch({ status: "searching" });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      runSearch(text, controller.signal)
        .then((suggestions) => setSearch({ status: "done", suggestions }))
        .catch((err: unknown) => {
          // A newer search replaced this one.
          if (controller.signal.aborted) return;
          setSearch({
            status: "failed",
            message: err instanceof ApiError ? err.message : "Address search isn't working.",
          });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function handleChangeText(text: string) {
    onChangeText(text);
    setQuery(text);
  }

  function handleSelect(suggestion: AddressSuggestion) {
    onSelect(suggestion);
    setQuery("");
    Keyboard.dismiss();
  }

  return (
    <View style={styles.field}>
      <TextField
        label={label}
        value={value}
        onChangeText={handleChangeText}
        error={error}
        hint={search.status === "idle" ? hint : undefined}
        placeholder={placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        // The suggestion list replaces the browser's and the keyboard's own.
        autoComplete="off"
        textContentType="none"
        returnKeyType="search"
      />

      {search.status !== "idle" ? (
        <View style={styles.panel}>
          {search.status === "searching" ? (
            <View style={styles.message}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.messageText}>Searching…</Text>
            </View>
          ) : search.status === "failed" ? (
            <View style={styles.message}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={[styles.messageText, styles.errorText]}>{search.message}</Text>
            </View>
          ) : search.suggestions.length === 0 ? (
            <View style={styles.message}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <Text style={styles.messageText}>
                No matching addresses. Try the street number and name, then the city.
              </Text>
            </View>
          ) : (
            <View accessibilityRole="list">
              {search.suggestions.map((suggestion, index) => (
                <Pressable
                  key={suggestion.token}
                  onPress={() => handleSelect(suggestion)}
                  style={({ pressed, hovered }) => [
                    styles.row,
                    index > 0 && styles.rowDivider,
                    (pressed || hovered) && styles.rowActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={suggestion.address}
                  accessibilityHint="Uses this address"
                >
                  <Ionicons name="location-outline" size={20} color={colors.primary} />
                  <View style={styles.rowText}>
                    <Text style={styles.title} numberOfLines={1}>
                      {suggestion.title}
                    </Text>
                    {suggestion.subtitle ? (
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {suggestion.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          {/* Required by Geoapify's free plan and the OpenStreetMap licence. */}
          <Text style={styles.attribution}>Powered by Geoapify · © OpenStreetMap contributors</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    field: {
      gap: 8,
    },
    panel: {
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 52,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowActive: {
      backgroundColor: `${colors.primary}14`,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
    },
    message: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    messageText: {
      flex: 1,
      color: colors.textMuted,
      fontSize: 14,
    },
    errorText: {
      color: colors.error,
    },
    attribution: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: "right",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
}
