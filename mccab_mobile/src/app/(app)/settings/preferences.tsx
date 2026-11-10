import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { ChoiceChips, SwitchRow } from "@/components/settings";
import { TextField } from "@/components/text-field";
import {
  CHAT_PREFERENCES,
  MAX_PRICE_PER_SEAT_DOLLARS,
  isDriver,
  type ChatPreference,
} from "@/constants/profile-options";
import type { Profile } from "@/lib/api";
import { formatPrice, parsePrice } from "@/lib/format";
import { useProfile } from "@/lib/profile";

const FIELDS = ["pricePerSeatCents", "chatPreference", "musicOk", "smokingOk"] as const;

export default function PreferencesScreen() {
  return <WithProfile>{(profile) => <PreferencesForm profile={profile} />}</WithProfile>;
}

function PreferencesForm({ profile }: { profile: Profile }) {
  const { update } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);
  const driver = isDriver(profile.rideRole);

  const [price, setPrice] = useState(
    profile.pricePerSeatCents === null ? "" : formatPrice(profile.pricePerSeatCents)!.slice(1),
  );
  const [chatPreference, setChatPreference] = useState<ChatPreference>(profile.chatPreference);
  const [musicOk, setMusicOk] = useState(profile.musicOk);
  const [smokingOk, setSmokingOk] = useState(profile.smokingOk);

  function handleSave() {
    const errors: Partial<Record<(typeof FIELDS)[number], string>> = {};
    const cents = price.trim() ? parsePrice(price) : null;
    if (driver && price.trim() && cents === null) {
      errors.pricePerSeatCents = "Enter an amount like 5 or 4.50.";
    }

    save(errors, () =>
      update({
        // Riders don't set a price; leave theirs unchanged.
        ...(driver ? { pricePerSeatCents: cents } : {}),
        chatPreference,
        musicOk,
        smokingOk,
      }),
    );
  }

  return (
    <FormScreen
      intro="Shown to the people you ride with, so everyone knows what to expect."
      saving={saving}
      formError={formError}
      onSave={handleSave}
    >
      {driver ? (
        <TextField
          label="Price per seat ($)"
          value={price}
          onChangeText={(value) => {
            setPrice(value);
            clearFieldError("pricePerSeatCents");
          }}
          error={fieldErrors.pricePerSeatCents}
          hint={`What each rider pays you for one trip, up to $${MAX_PRICE_PER_SEAT_DOLLARS}. Payments are added later.`}
          placeholder="5"
          keyboardType="decimal-pad"
        />
      ) : null}

      <ChoiceChips
        label="Conversation"
        options={CHAT_PREFERENCES}
        value={chatPreference}
        onChange={setChatPreference}
        error={fieldErrors.chatPreference}
      />

      {/* SwitchRow has its own padding; pull it to the card's edges. */}
      <View style={styles.switches}>
        <SwitchRow label="Music is OK" value={musicOk} onValueChange={setMusicOk} />
        <SwitchRow
          label="Smoking is OK"
          description="Most students prefer smoke-free rides."
          value={smokingOk}
          onValueChange={setSmokingOk}
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  switches: {
    marginHorizontal: -16,
    marginVertical: -8,
  },
});
