import { useState } from "react";

import { FormScreen, useSaveHandler } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import { useProfile } from "@/lib/profile";

const FIELDS = ["password"] as const;

export default function DeleteAccountScreen() {
  const { deleteAccount } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);
  const [password, setPassword] = useState("");

  function handleDelete() {
    const errors = password ? {} : { password: "Enter your password to confirm." };
    // On success the session ends and the app returns to the login screen.
    save(errors, () => deleteAccount(password), { goBack: false });
  }

  return (
    <FormScreen
      intro="This permanently deletes your account, your profile and your car. It can't be undone. You can sign up again later with the same school email."
      saveLabel="Delete my account"
      destructive
      saving={saving}
      formError={formError}
      onSave={handleDelete}
    >
      <TextField
        label="Password"
        password
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearFieldError("password");
        }}
        error={fieldErrors.password}
        autoComplete="current-password"
        textContentType="password"
      />
    </FormScreen>
  );
}
