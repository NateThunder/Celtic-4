export type CommunitySignup = {
  firstName: string;
  lastName: string;
  email: string;
};

export type CommunitySignupPayload = CommunitySignup & {
  consent: boolean;
  website?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 60 || CONTROL_CHARACTERS.test(name)) return null;
  return name;
}

export function parseCommunitySignup(value: unknown): CommunitySignup | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<CommunitySignupPayload>;
  const firstName = cleanName(payload.firstName);
  const lastName = cleanName(payload.lastName);
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (
    !firstName ||
    !lastName ||
    payload.consent !== true ||
    !email ||
    email.length > 254 ||
    CONTROL_CHARACTERS.test(email) ||
    !EMAIL_PATTERN.test(email)
  ) {
    return null;
  }

  return { firstName, lastName, email };
}

export function isHoneypotSubmission(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const website = (value as Partial<CommunitySignupPayload>).website;
  return typeof website === "string" && website.trim().length > 0;
}
