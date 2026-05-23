import { NextResponse, type NextRequest } from "next/server";
import { getStemPurchaseDetails, type StemPurchaseKind } from "../../../lib/stemCheckout";
import { getStripeClient } from "../../../lib/stripe";

export const runtime = "nodejs";

type StemCheckoutPayload = {
  trackId?: unknown;
  stemId?: unknown;
  purchaseKind?: unknown;
};

function getSiteOrigin(request: NextRequest): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configuredOrigin) return configuredOrigin.replace(/\/+$/, "");
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  let payload: StemCheckoutPayload;

  try {
    payload = (await request.json()) as StemCheckoutPayload;
  } catch {
    return NextResponse.json({ message: "Invalid checkout request." }, { status: 400 });
  }

  const trackId = typeof payload.trackId === "string" ? payload.trackId.trim() : "";
  const stemId = typeof payload.stemId === "string" ? payload.stemId.trim() : "";
  const purchaseKind: StemPurchaseKind = payload.purchaseKind === "all" ? "all" : "stem";

  if (!trackId) {
    return NextResponse.json({ message: "A stem session is required." }, { status: 400 });
  }

  const lookup = await getStemPurchaseDetails({
    trackId,
    stemId,
    kind: purchaseKind,
  });

  if (!lookup.ok) {
    return NextResponse.json({ message: lookup.message }, { status: lookup.status });
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Stripe is not configured.",
      },
      { status: 500 },
    );
  }

  const origin = getSiteOrigin(request);
  const { purchase } = lookup;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: purchase.unitAmount,
          product_data: {
            name: purchase.title,
            description: purchase.description,
          },
        },
      },
    ],
    metadata: {
      purchaseKind: purchase.kind,
      trackId: purchase.track.id,
      stemId: purchase.stem?.id || "",
    },
    payment_intent_data: {
      metadata: {
        purchaseKind: purchase.kind,
        trackId: purchase.track.id,
        stemId: purchase.stem?.id || "",
      },
    },
    success_url: `${origin}/stem-player/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/stem-player/checkout/cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ message: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
