import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommon from "@zxcvbn-ts/language-common";
import * as zxcvbnEn from "@zxcvbn-ts/language-en";

// zxcvbn scores passwords from 0 (very guessable) to 4 (very hard to guess).
const MIN_PASSWORD_SCORE = 3;

const zxcvbn = new ZxcvbnFactory({
  dictionary: { ...zxcvbnCommon.dictionary, ...zxcvbnEn.dictionary },
  graphs: zxcvbnCommon.adjacencyGraphs,
  translations: zxcvbnEn.translations,
});

// Returns a message explaining why the password is too weak, or null when it's
// strong enough. userInputs are the user's own details (name, email), so that a
// password based on them scores lower.
export function getPasswordProblem(password: string, userInputs: string[]): string | null {
  const { score, feedback } = zxcvbn.check(password, userInputs);
  if (score >= MIN_PASSWORD_SCORE) {
    return null;
  }

  const details = [feedback.warning, feedback.suggestions[0]].filter(Boolean).join(" ");
  return `This password is too easy to guess. ${details || "Try a longer one."}`;
}

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything after 72 bytes, so longer passwords are rejected.
export const MAX_PASSWORD_BYTES = 72;

// Checks a password someone is choosing (sign-up, reset, change). Returns a
// message describing the first problem, or null when it's fine.
// Length checks run before zxcvbn so very long input never reaches it.
export function validateNewPassword(password: unknown, userInputs: string[]): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} characters.`;
  }
  return getPasswordProblem(password, userInputs);
}

// Cost factor for bcrypt password hashes.
export const BCRYPT_ROUNDS = 10;
