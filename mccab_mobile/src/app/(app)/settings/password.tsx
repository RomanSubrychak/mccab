import { useState } from "react";

import { FormScreen, useSaveHandler } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import { useProfile } from "@/lib/profile";

const FIELDS = ["currentPassword", "newPassword", "confirmPassword"] as const;
const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordScreen() {
  const { changePassword } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSave() {
    const errors: Partial<Record<(typeof FIELDS)[number], string>> = {};
    if (!currentPassword) errors.currentPassword = "Enter your current password.";
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword) errors.confirmPassword = "Repeat your new password.";
    else if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords don't match.";

    // The server also checks how easy the new password is to guess.
    save(errors, () => changePassword(currentPassword, newPassword));
  }

  return (
    <FormScreen
      intro="You'll stay signed in here. Every other phone or browser will be signed out."
      saveLabel="Change password"
      saving={saving}
      formError={formError}
      onSave={handleSave}
    >
      <TextField
        label="Current password"
        password
        value={currentPassword}
        onChangeText={(value) => {
          setCurrentPassword(value);
          clearFieldError("currentPassword");
        }}
        error={fieldErrors.currentPassword}
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        label="New password"
        password
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          clearFieldError("newPassword");
        }}
        error={fieldErrors.newPassword}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Longer phrases work best.`}
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm new password"
        password
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          clearFieldError("confirmPassword");
        }}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
        textContentType="newPassword"
      />
    </FormScreen>
  );
}
