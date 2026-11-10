import { Children, Fragment, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useThemeColors, type Colors } from "@/constants/theme";
import { initials } from "@/lib/format";

type IconName = ComponentProps<typeof Ionicons>["name"];

// React Native Web colours the "on" knob with its own prop (teal by default),
// which isn't in React Native's types.
const WEB_SWITCH_PROPS = Platform.OS === "web" ? ({ activeThumbColor: "#FFFFFF" } as object) : {};

// A titled card of rows, like a section in the phone's Settings app.
export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
}) {
  const styles = createStyles(useThemeColors());
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? (
        <Text style={styles.groupTitle} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={styles.groupCard}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.separator} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

// A row that opens another screen (or runs an action), with an optional summary value.
export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  showChevron = true,
}: {
  icon?: IconName;
  label: string;
  value?: string | null;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const tint = destructive ? colors.error : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {icon ? <Ionicons name={icon} size={20} color={destructive ? colors.error : colors.primary} /> : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
        {value ? (
          <Text style={styles.rowValue} numberOfLines={2}>
            {value}
          </Text>
        ) : null}
      </View>
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

// A row with an on/off switch.
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowValue}>{description}</Text> : null}
      </View>
      <Switch
        {...WEB_SWITCH_PROPS}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

type ChipOption<T extends string | number> = { value: T; label: string };

// A row of tappable options. Single choice by default; pass `multiple` for several.
export function ChoiceChips<T extends string | number>(
  props: {
    label?: string;
    options: ChipOption<T>[];
    error?: string | null;
  } & (
    | { multiple?: false; value: T | null; onChange: (value: T) => void }
    | { multiple: true; value: T[]; onChange: (value: T[]) => void }
  ),
) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  function isSelected(option: T) {
    return props.multiple ? props.value.includes(option) : props.value === option;
  }

  function press(option: T) {
    if (props.multiple) {
      props.onChange(
        isSelected(option)
          ? props.value.filter((value) => value !== option)
          : [...props.value, option],
      );
    } else {
      props.onChange(option);
    }
  }

  return (
    <View style={styles.chipField}>
      {props.label ? <Text style={styles.fieldLabel}>{props.label}</Text> : null}
      <View style={styles.chips} accessibilityRole={props.multiple ? undefined : "radiogroup"}>
        {props.options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => press(option.value)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole={props.multiple ? "checkbox" : "radio"}
              accessibilityState={props.multiple ? { checked: selected } : { selected }}
              accessibilityLabel={option.label}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {props.error ? <Text style={styles.errorText}>{props.error}</Text> : null}
    </View>
  );
}

// Round badge with the user's initials (photo upload comes later).
export function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityLabel={`${name}'s profile picture`}
    >
      <Text style={{ color: colors.onPrimary, fontSize: size * 0.38, fontWeight: "800" }}>
        {initials(name)}
      </Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    group: {
      gap: 8,
    },
    groupTitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: 4,
    },
    groupCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    groupFooter: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginHorizontal: 4,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
    },
    rowValue: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 19,
    },
    chipField: {
      gap: 8,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    chipTextSelected: {
      color: colors.onPrimary,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
