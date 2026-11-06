import { useId, useState, type Ref } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from "react-native";

import { useTheme, useThemeColors, type Colors } from "@/constants/theme";

type TextFieldProps = Omit<TextInputProps, "style" | "secureTextEntry"> & {
  label: string;
  // Shown under the input in red; also turns the border red.
  error?: string | null;
  // Shown under the input when there is no error.
  hint?: string;
  // Renders a Show/Hide toggle and masks the value.
  password?: boolean;
  ref?: Ref<TextInputInstance>;
};

export function TextField({
  label,
  error,
  hint,
  password = false,
  editable = true,
  onFocus,
  onBlur,
  ref,
  ...inputProps
}: TextFieldProps) {
  const colors = useThemeColors();
  const { scheme } = useTheme();
  const styles = createStyles(colors);
  const labelId = useId();

  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const message = error ?? hint;

  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
          !editable && styles.inputWrapperDisabled,
        ]}
      >
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          keyboardAppearance={scheme}
          secureTextEntry={password && !revealed}
          editable={editable}
          accessibilityLabelledBy={labelId}
          accessibilityLabel={label}
          aria-invalid={error ? true : undefined}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />

        {password ? (
          <Pressable
            style={styles.toggle}
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <Text style={styles.toggleText}>{revealed ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>

      {message ? (
        <Text
          style={error ? styles.errorText : styles.hintText}
          accessibilityLiveRegion={error ? "polite" : "none"}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    field: {
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    inputWrapperFocused: {
      borderColor: colors.primary,
      // Soft focus ring built from the primary color.
      boxShadow: `0 0 0 4px ${colors.primary}26`,
    },
    inputWrapperError: {
      borderColor: colors.error,
    },
    inputWrapperDisabled: {
      opacity: 0.6,
    },
    input: {
      flex: 1,
      alignSelf: "stretch",
      color: colors.text,
      fontSize: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      // The wrapper draws the focus state, so hide the browser's own outline on web.
      outlineWidth: 0,
    },
    toggle: {
      alignSelf: "stretch",
      justifyContent: "center",
      paddingHorizontal: 16,
      minWidth: 64,
      alignItems: "center",
    },
    toggleText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      fontWeight: "500",
    },
    hintText: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
}
