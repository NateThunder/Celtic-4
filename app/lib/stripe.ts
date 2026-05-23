import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }

  stripeClient ??= new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
  });

  return stripeClient;
}
