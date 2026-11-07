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
