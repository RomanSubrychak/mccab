import { useState } from "react";

import { FormScreen, WithProfile, useSaveHandler } from "@/components/form-screen";
import { TextField } from "@/components/text-field";
import type { Profile } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { useProfile } from "@/lib/profile";

const FIELDS = ["name", "phone", "major", "graduationYear", "bio"] as const;
const MAX_BIO_LENGTH = 300;

export default function AboutScreen() {
  return <WithProfile>{(profile) => <AboutForm profile={profile} />}</WithProfile>;
}

function AboutForm({ profile }: { profile: Profile }) {
  const { update } = useProfile();
  const { saving, formError, fieldErrors, save, clearFieldError } = useSaveHandler(FIELDS);

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(formatPhone(profile.phone) ?? "");
  const [major, setMajor] = useState(profile.major ?? "");
  const [graduationYear, setGraduationYear] = useState(
    profile.graduationYear ? String(profile.graduationYear) : "",
  );
  const [bio, setBio] = useState(profile.bio ?? "");

  function handleSave() {
    const year = graduationYear.trim();
    const errors: Partial<Record<(typeof FIELDS)[number], string>> = {};
    if (name.trim().length === 0) errors.name = "Enter your name.";
    if (year && !/^\d{4}$/.test(year)) errors.graduationYear = "Enter a year like 2027.";
    if (bio.length > MAX_BIO_LENGTH) errors.bio = `Keep it under ${MAX_BIO_LENGTH} characters.`;

    // The server checks the phone number and the year range.
    save(errors, () =>
      update({
        name: name.trim(),
        phone: phone.trim(),
        major: major.trim(),
        graduationYear: year ? Number(year) : null,
        bio: bio.trim(),
      }),
    );
  }

  return (
    <FormScreen
      intro="Riders and drivers see your name and program. Your phone number is private (see Safety). Change whether you ride or drive at the top of your profile."
      saving={saving}
      formError={formError}
      onSave={handleSave}
    >
      <TextField
        label="Full name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          clearFieldError("name");
        }}
        error={fieldErrors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Phone number"
        value={phone}
        onChangeText={(value) => {
          setPhone(value);
          clearFieldError("phone");
        }}
        error={fieldErrors.phone}
        hint="US numbers only. Used to coordinate pickups."
        placeholder="(312) 555-0123"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <TextField
        label="Program or major"
        value={major}
        onChangeText={(value) => {
          setMajor(value);
          clearFieldError("major");
        }}
        error={fieldErrors.major}
        placeholder="Medical Assisting"
        autoCapitalize="words"
      />
      <TextField
        label="Expected graduation year"
        value={graduationYear}
        onChangeText={(value) => {
          setGraduationYear(value);
          clearFieldError("graduationYear");
        }}
        error={fieldErrors.graduationYear}
        placeholder={String(new Date().getFullYear() + 1)}
        keyboardType="number-pad"
        maxLength={4}
      />
      <TextField
        label="About me"
        value={bio}
        onChangeText={(value) => {
          setBio(value);
          clearFieldError("bio");
        }}
        error={fieldErrors.bio}
        hint={`${bio.length}/${MAX_BIO_LENGTH}. A sentence or two, e.g. your classes or what you like to talk about.`}
        placeholder="Second-year student, usually on campus Mon to Thu."
        multiline
        numberOfLines={3}
        maxLength={MAX_BIO_LENGTH}
      />
    </FormScreen>
  );
}
