import type { CommunitySignup } from "./communitySignup";
import { getMailchimpConfig, subscribeToMailchimp } from "./mailchimpSignup";

const DEFAULT_SUBSCRIBE_URL =
  "https://cms.celticworship.co.uk/wp-admin/admin-ajax.php?action=tnp&na=s";

async function deliverToWordPress(signup: CommunitySignup): Promise<void> {
  const subscribeUrl = process.env.NEWSLETTER_SUBSCRIBE_URL?.trim() || DEFAULT_SUBSCRIBE_URL;
  const signupFields = {
    nlang: "",
    nn: signup.firstName,
    ns: signup.lastName,
    ne: signup.email,
    ny: "1",
  };

  const challengeResponse = await fetch(subscribeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "CelticWorshipWebsite/1.0",
    },
    body: new URLSearchParams(signupFields),
    cache: "no-store",
    redirect: "follow",
  });

  if (!challengeResponse.ok) {
    throw new Error(`Newsletter subscription failed with status ${challengeResponse.status}.`);
  }

  const challengeHtml = await challengeResponse.text();
  const timestamp = challengeHtml.match(/name=["']ts["']\s+value=["'](\d+)["']/i)?.[1];
  let response = challengeResponse;

  if (timestamp) {
    const endpoint = new URL(subscribeUrl);
    endpoint.search = "";
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "CelticWorshipWebsite/1.0",
      },
      body: new URLSearchParams({
        action: "tnp",
        na: "s",
        ...signupFields,
        ts: timestamp,
      }),
      cache: "no-store",
      redirect: "follow",
    });
  }

  if (!response.ok) {
    throw new Error(`Newsletter subscription failed with status ${response.status}.`);
  }
}

/**
 * Sends a website signup to Mailchimp (when MAILCHIMP_API_KEY is set) and to the
 * WordPress newsletter list as a backup copy. Succeeds if at least one accepts it.
 */
export async function deliverCommunitySignup(signup: CommunitySignup): Promise<void> {
  const mailchimp = getMailchimpConfig();
  const providers: [string, Promise<void>][] = [["wordpress-newsletter", deliverToWordPress(signup)]];
  if (mailchimp) providers.unshift(["mailchimp", subscribeToMailchimp(signup, mailchimp)]);

  const results = await Promise.allSettled(providers.map(([, delivery]) => delivery));
  const delivered: string[] = [];
  const failures: string[] = [];
  results.forEach((result, index) => {
    const provider = providers[index][0];
    if (result.status === "fulfilled") {
      delivered.push(provider);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : "unknown";
      failures.push(`${provider}: ${reason}`);
      console.error(JSON.stringify({ event: "community_signup_provider_failed", provider, reason }));
    }
  });

  if (!delivered.length) throw new Error(failures.join("; "));
  console.log(JSON.stringify({ event: "community_signup_delivered", providers: delivered }));
}
