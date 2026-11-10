// Only emails at exactly this domain can sign up (no subdomains).
// The server checks the same domain: ALLOWED_EMAIL_DOMAIN in server/src/routes/auth.ts.
export const SCHOOL_EMAIL_DOMAIN = "mccollege.edu";

export const SCHOOL_EMAIL_EXAMPLE = `you@${SCHOOL_EMAIL_DOMAIN}`;

// Expects an email that is already trimmed and lowercased.
export function isSchoolEmail(email: string): boolean {
  return email.split("@")[1] === SCHOOL_EMAIL_DOMAIN;
}
