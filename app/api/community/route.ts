import { deliverCommunitySignup } from "../../lib/communitySignupDelivery";
import { isHoneypotSubmission, parseCommunitySignup } from "../../lib/communitySignup";
import { isSameOriginRequest } from "../../lib/requestOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) return json({ error: "Request is too large." }, 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Expected a JSON request." }, 415);
  }

  if (!isSameOriginRequest(request)) return json({ error: "Invalid request origin." }, 403);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  // Bots commonly fill fields hidden from people. Return a normal response without sending email.
  if (isHoneypotSubmission(payload)) return json({ ok: true });

  const signup = parseCommunitySignup(payload);
  if (!signup) return json({ error: "Please provide valid details and consent." }, 400);

  try {
    await deliverCommunitySignup(signup);
    return json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({
      event: "community_signup_delivery_failed",
      reason: error instanceof Error ? error.message : "unknown",
    }));
    return json({ error: "Mailing-list signup is temporarily unavailable." }, 503);
  }
}
