import { createHash } from "node:crypto";
import type { CommunitySignup } from "./communitySignup";

// The Celtic Worship audience in Mailchimp. Override with MAILCHIMP_AUDIENCE_ID if it ever changes.
export const DEFAULT_MAILCHIMP_AUDIENCE_ID = "522581d030";
export const MAILCHIMP_SIGNUP_TAG = "Website signup";

export type MailchimpConfig = {
  apiKey: string;
  audienceId: string;
};

type Fetch = typeof fetch;

export function getMailchimpConfig(env: Record<string, string | undefined> = process.env): MailchimpConfig | null {
  const apiKey = env.MAILCHIMP_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    audienceId: env.MAILCHIMP_AUDIENCE_ID?.trim() || DEFAULT_MAILCHIMP_AUDIENCE_ID,
  };
}

/** Mailchimp keys end in their data centre, e.g. "...-us5". */
export function mailchimpApiBase(apiKey: string): string {
  const dataCentre = apiKey.includes("-") ? apiKey.split("-").pop() ?? "" : "";
  if (!/^[a-z]+\d+$/.test(dataCentre)) throw new Error("Mailchimp API key is missing its data centre suffix.");
  return `https://${dataCentre}.api.mailchimp.com/3.0`;
}

export function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Adds the person to the audience, or updates their name if they're already on it.
 * Someone who previously unsubscribed is left unsubscribed: Mailchimp only applies
 * `status_if_new` to new contacts, so this never re-subscribes anyone.
 */
export async function subscribeToMailchimp(
  signup: CommunitySignup,
  config: MailchimpConfig,
  fetcher: Fetch = fetch,
): Promise<void> {
  const memberUrl = `${mailchimpApiBase(config.apiKey)}/lists/${encodeURIComponent(config.audienceId)}/members/${subscriberHash(signup.email)}`;
  const headers = {
    Authorization: `Basic ${Buffer.from(`celticworship:${config.apiKey}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
  const member = {
    email_address: signup.email,
    status_if_new: "subscribed",
  };

  let response = await fetcher(memberUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...member, merge_fields: { FNAME: signup.firstName, LNAME: signup.lastName } }),
    cache: "no-store",
  });

  // If the audience's name fields use different tags, still save the email address.
  if (response.status === 400) {
    const detail = await response.text();
    if (/merge field/i.test(detail)) {
      response = await fetcher(memberUrl, { method: "PUT", headers, body: JSON.stringify(member), cache: "no-store" });
    } else {
      throw new Error(`Mailchimp rejected the signup (400): ${detail.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new Error(`Mailchimp signup failed with status ${response.status}.`);
  }

  // Tag where they came from. Not essential, so a failure here doesn't fail the signup.
  try {
    await fetcher(`${memberUrl}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tags: [{ name: MAILCHIMP_SIGNUP_TAG, status: "active" }] }),
      cache: "no-store",
    });
  } catch {
    // ignore
  }
}
