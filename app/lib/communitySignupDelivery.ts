import type { CommunitySignup } from "./communitySignup";

const DEFAULT_SUBSCRIBE_URL =
  "https://cms.celticworship.co.uk/wp-admin/admin-ajax.php?action=tnp&na=s";

export async function deliverCommunitySignup(signup: CommunitySignup): Promise<void> {
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

  console.log(JSON.stringify({
    event: "community_signup_delivered",
    provider: "wordpress-newsletter",
  }));
}
