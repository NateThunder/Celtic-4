"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { PaymentMethodCreateParams, Stripe, StripeCardElement } from "@stripe/stripe-js";
import type { ShopStripeAction } from "../../lib/shopPayments";
import styles from "../../shop/checkout/checkout.module.css";

type BillingDetails = PaymentMethodCreateParams.BillingDetails;

export type ShopStripeCardHandle = {
  createPaymentMethod: (billing: BillingDetails) => Promise<string>;
  confirm: (action: ShopStripeAction, billing: BillingDetails) => Promise<void>;
};

export default function ShopStripeCard({ publishableKey, onReady, ref }: {
  publishableKey: string;
  onReady: (ready: boolean) => void;
  ref: Ref<ShopStripeCardHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let card: StripeCardElement | null = null;
    onReady(false);

    async function mountCard() {
      try {
        const stripe = await loadStripe(publishableKey);
        if (cancelled) return;
        if (!stripe || !container.current) throw new Error("Card payments could not load. Please refresh or use PayPal.");
        stripeRef.current = stripe;
        card = stripe.elements().create("card", {
          hidePostalCode: true,
          style: {
            base: { color: "#121212", fontSize: "16px", fontFamily: "Arial, sans-serif", "::placeholder": { color: "#666666" } },
            invalid: { color: "#a31c1c" },
          },
        });
        cardRef.current = card;
        card.on("ready", () => { if (!cancelled) { setLoading(false); onReady(true); } });
        card.on("change", (event) => { if (!cancelled) setError(event.error?.message || ""); });
        card.on("loaderror", () => {
          if (!cancelled) { setLoading(false); onReady(false); setError("Card payments could not load. Please refresh or use PayPal."); }
        });
        card.mount(container.current);
      } catch (cause) {
        if (!cancelled) {
          setLoading(false);
          setError(cause instanceof Error ? cause.message : "Card payments could not load. Please use PayPal.");
        }
      }
    }
    void mountCard();
    return () => { cancelled = true; card?.destroy(); cardRef.current = null; stripeRef.current = null; onReady(false); };
  }, [publishableKey, onReady]);

  useImperativeHandle(ref, () => {
    async function createPaymentMethod(billing: BillingDetails): Promise<string> {
      if (!stripeRef.current || !cardRef.current) throw new Error("Please wait for the card form to load.");
      const result = await stripeRef.current.createPaymentMethod({ type: "card", card: cardRef.current, billing_details: billing });
      if (result.error) throw new Error(result.error.message || "Please check your card details.");
      return result.paymentMethod.id;
    }
    return {
      createPaymentMethod,
      async confirm(action, billing) {
        const stripe = stripeRef.current;
        if (!stripe) throw new Error("Please wait for the card form to load.");
        if (action.kind === "setup") {
          const result = await stripe.confirmCardSetup(action.clientSecret);
          if (result.error) throw new Error(result.error.message || "Card verification failed. Please try again.");
          if (result.setupIntent.status !== "succeeded") throw new Error("Card verification is not complete. Please try again.");
          return;
        }
        // A cancelled authentication is retried on the same order and PaymentIntent.
        const current = await stripe.retrievePaymentIntent(action.clientSecret);
        if (current.error) throw new Error(current.error.message || "Unable to check the payment. Please retry verification.");
        if (["succeeded", "requires_capture"].includes(current.paymentIntent.status)) return;
        const paymentMethod = current.paymentIntent.status === "requires_payment_method"
          ? await createPaymentMethod(billing) : undefined;
        const result = await stripe.confirmCardPayment(action.clientSecret, paymentMethod ? { payment_method: paymentMethod } : {});
        if (result.error) throw new Error(result.error.message || "Card verification failed. Please try again.");
        if (!["succeeded", "requires_capture"].includes(result.paymentIntent.status)) {
          throw new Error("Your payment is still being confirmed. Please retry verification before placing another order.");
        }
      },
    };
  }, []);

  return (
    <div className={styles.cardFields}>
      <span className={styles.paymentLabel}>Card details</span>
      <div className={styles.stripeElement} ref={container} />
      {loading ? <p className={styles.status} role="status">Loading secure card form...</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <p className={styles.cardHelp}>Secure payment by Stripe.</p>
    </div>
  );
}
