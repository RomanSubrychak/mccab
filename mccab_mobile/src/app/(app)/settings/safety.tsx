import { useState } from "react";

import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { ChoiceChips } from "@/components/settings";
import { TextField } from "@/components/text-field";
import { PHONE_VISIBILITIES, type PhoneVisibility } from "@/constants/profile-options";
import type { Profile } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { useProfile } from "@/lib/profile";

const FIELDS = ["emergencyContactName", "emergencyContactPhone", "phoneVisibility"] as const;

export default function SafetyScreen() {
  return <WithProfile>{(profile) => <SafetyForm profile={profile} />}</WithProfile>;
}

function SafetyForm({ profile }: { profile: Profile }) {
  const { update } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);

  const [contactName, setContactName] = useState(profile.emergencyContactName ?? "");
  const [contactPhone, setContactPhone] = useState(formatPhone(profile.emergencyContactPhone) ?? "");
  const [phoneVisibility, setPhoneVisibility] = useState<PhoneVisibility>(profile.phoneVisibility);

  function handleSave() {
    const errors: Partial<Record<(typeof FIELDS)[number], string>> = {};
    // Both or neither: a name without a number (or the reverse) isn't useful.
    if (contactName.trim() && !contactPhone.trim()) {
      errors.emergencyContactPhone = "Add their phone number.";
    }
    if (contactPhone.trim() && !contactName.trim()) {
      errors.emergencyContactName = "Add their name.";
    }

    save(errors, () =>
      update({
        emergencyContactName: contactName.trim(),
        emergencyContactPhone: contactPhone.trim(),
        phoneVisibility,
      }),
    );
  }

  return (
    <FormScreen
      intro="Your emergency contact is never shown to other students. It's kept for safety features like sharing your trip."
      saving={saving}
      formError={formError}
      onSave={handleSave}
    >
      <TextField
        label="Emergency contact name"
        value={contactName}
        onChangeText={(value) => {
          setContactName(value);
          clearFieldError("emergencyContactName");
        }}
        error={fieldErrors.emergencyContactName}
        placeholder="Parent, partner or friend"
        autoCapitalize="words"
      />
      <TextField
        label="Emergency contact phone"
        value={contactPhone}
        onChangeText={(value) => {
          setContactPhone(value);
          clearFieldError("emergencyContactPhone");
        }}
        error={fieldErrors.emergencyContactPhone}
        placeholder="(312) 555-0123"
        keyboardType="phone-pad"
      />
      <ChoiceChips
        label="Who can see my phone number"
        options={PHONE_VISIBILITIES}
        value={phoneVisibility}
        onChange={setPhoneVisibility}
        error={fieldErrors.phoneVisibility}
      />
    </FormScreen>
  );
}
