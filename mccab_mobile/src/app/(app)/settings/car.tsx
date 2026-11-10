import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { ChoiceChips } from "@/components/settings";
import { TextField } from "@/components/text-field";
import { MAX_SEATS } from "@/constants/profile-options";
import { useThemeColors } from "@/constants/theme";
import type { Profile } from "@/lib/api";
import { useProfile } from "@/lib/profile";

const FIELDS = ["make", "model", "year", "color", "plate", "seats"] as const;
type Field = (typeof FIELDS)[number];

const SEAT_OPTIONS = Array.from({ length: MAX_SEATS }, (_, index) => ({
  value: index + 1,
  label: String(index + 1),
}));

export default function CarScreen() {
  return <WithProfile>{(profile) => <CarForm profile={profile} />}</WithProfile>;
}

function CarForm({ profile }: { profile: Profile }) {
  const colors = useThemeColors();
  const { saveVehicle, removeVehicle } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);
  const car = profile.vehicle;

  const [make, setMake] = useState(car?.make ?? "");
  const [model, setModel] = useState(car?.model ?? "");
  const [year, setYear] = useState(car?.year ? String(car.year) : "");
  const [color, setColor] = useState(car?.color ?? "");
  const [plate, setPlate] = useState(car?.plate ?? "");
  const [seats, setSeats] = useState<number | null>(car?.seats ?? null);

  function handleSave() {
    const errors: Partial<Record<Field, string>> = {};
    if (!make.trim()) errors.make = "Enter your car's make.";
    if (!model.trim()) errors.model = "Enter your car's model.";
    if (year.trim() && !/^\d{4}$/.test(year.trim())) errors.year = "Enter a year like 2018.";
    if (!color.trim()) errors.color = "Enter your car's colour.";
    if (!plate.trim()) errors.plate = "Enter your licence plate.";
    if (seats === null) errors.seats = "Choose how many seats you offer.";

    save(errors, () =>
      saveVehicle({
        make: make.trim(),
        model: model.trim(),
        year: year.trim() ? Number(year.trim()) : null,
        color: color.trim(),
        plate: plate.trim(),
        seats: seats!,
      }),
    );
  }

  // Each field clears its own error when edited.
  function field(name: Field, setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      clearFieldError(name);
    };
  }

  return (
    <FormScreen
      intro="Riders use the colour and plate to find you at pickup. Your plate is only shown to people in a confirmed ride."
      saveLabel={car ? "Save" : "Add car"}
      saving={saving}
      formError={formError}
      onSave={handleSave}
      footer={
        car ? (
          <Pressable
            onPress={() => save({}, removeVehicle)}
            disabled={saving}
            accessibilityRole="button"
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={[styles.removeText, { color: colors.error }]}>Remove this car</Text>
          </Pressable>
        ) : null
      }
    >
      <TextField
        label="Make"
        value={make}
        onChangeText={field("make", setMake)}
        error={fieldErrors.make}
        placeholder="Toyota"
        autoCapitalize="words"
      />
      <TextField
        label="Model"
        value={model}
        onChangeText={field("model", setModel)}
        error={fieldErrors.model}
        placeholder="Corolla"
        autoCapitalize="words"
      />
      <TextField
        label="Year (optional)"
        value={year}
        onChangeText={field("year", setYear)}
        error={fieldErrors.year}
        placeholder="2018"
        keyboardType="number-pad"
        maxLength={4}
      />
      <TextField
        label="Colour"
        value={color}
        onChangeText={field("color", setColor)}
        error={fieldErrors.color}
        placeholder="Silver"
        autoCapitalize="words"
      />
      <TextField
        label="Licence plate"
        value={plate}
        onChangeText={field("plate", setPlate)}
        error={fieldErrors.plate}
        placeholder="AB 12345"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
      />
      <ChoiceChips
        label="Seats I offer"
        options={SEAT_OPTIONS}
        value={seats}
        onChange={(value) => {
          setSeats(value);
          clearFieldError("seats");
        }}
        error={fieldErrors.seats}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  remove: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  removeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
});
