"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe, StripeExpressCheckoutElement } from "@stripe/stripe-js";
import { SHOP_STRIPE_METHOD, type ShopStripeAction, type ShopWalletCheckout, type ShopWalletQuote } from "../../lib/shopPayments";
import styles from "../../shop/checkout/checkout.module.css";

type WalletPaymentResponse = {
  message?: string;
  stripeError?: string;
  stripeAction?: ShopStripeAction | null;
  payment_result?: { payment_status?: string; redirect_url?: string };
};

export default function ShopWalletPayments({ publishableKey, checkout, disabled, validate, refreshCart, onLock, onFinished }: {
  publishableKey: string;
  checkout: ShopWalletCheckout;
  disabled: boolean;
  validate: () => boolean;
  refreshCart: () => Promise<void>;
  onLock: (locked: boolean) => void;
  onFinished: (finished: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const disabledRef = useRef(disabled);
  const pending = useRef<ShopStripeAction | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const [secure, setSecure] = useState<boolean | null>(null);
  const [quote, setQuote] = useState<ShopWalletQuote | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [availability, setAvailability] = useState<"loading" | "ready" | "unavailable">("loading");
  const [error, setError] = useState("");
  const [retryVerification, setRetryVerification] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => { setSecure(window.location.protocol === "https:"); }, []);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  async function prepare() {
    if (disabled || busy.current || !validate()) return;
    busy.current = true;
    setPreparing(true);
    setError("");
    onLock(true);
    try {
      const response = await fetch("/api/shop/checkout/prepare", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checkout),
      });
      const data = await response.json() as ShopWalletQuote & { message?: string };
      if (!response.ok) throw new Error(data.message || "Unable to calculate your order total.");
      await refreshCart();
      setAvailability("loading");
      setQuote(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to prepare wallet payments.");
    } finally {
      busy.current = false;
      setPreparing(false);
      onLock(false);
    }
  }

  async function verifyPending() {
    const action = pending.current;
    const stripe = stripeRef.current;
    if (!action || !stripe || busy.current) return;
    busy.current = true;
    onLock(true);
    setError("");
    try {
      const result = await stripe.handleNextAction({ clientSecret: action.clientSecret });
      if (result.error) throw new Error(result.error.message || "Bank verification was not completed. Please retry.");
      const intent = result.paymentIntent || result.setupIntent;
      if (!intent || !["succeeded", "requires_capture"].includes(intent.status)) {
        throw new Error("Payment has not been confirmed. Please contact the shop before placing another order.");
      }
      setFinished(true);
      onFinished(true);
      window.location.assign(action.verificationUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to verify the payment.");
    } finally { busy.current = false; }
  }

  useEffect(() => {
    if (!secure || !quote) return;
    let cancelled = false;
    let express: StripeExpressCheckoutElement | null = null;

    async function mountWallets() {
      try {
        const stripe = await loadStripe(publishableKey);
        if (cancelled) return;
        if (!stripe || !container.current) throw new Error("Wallet payments could not load. Please use card or PayPal.");
        stripeRef.current = stripe;
        const elements = stripe.elements({
          mode: "payment", amount: quote!.amount, currency: quote!.currency,
          paymentMethodTypes: ["card"], paymentMethodCreation: "manual",
          appearance: { theme: "stripe", variables: { borderRadius: "12px" } },
        });
        express = elements.create("expressCheckout", {
          buttonHeight: 48,
          paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", paypal: "never", amazonPay: "never", klarna: "never" },
          buttonType: { applePay: "buy", googlePay: "pay" },
          layout: { maxColumns: 2, maxRows: 1 },
          emailRequired: true,
        });
        express.on("ready", ({ availablePaymentMethods }) => {
          if (!cancelled) setAvailability(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay ? "ready" : "unavailable");
        });
        express.on("loaderror", () => {
          if (!cancelled) { setAvailability("unavailable"); setError("Wallet payments could not load. Please use card or PayPal."); }
        });
        express.on("click", (event) => {
          if (busy.current || disabledRef.current || pending.current) { event.reject(); return; }
          onLock(true);
          event.resolve();
        });
        express.on("cancel", () => { if (!busy.current && !pending.current) onLock(false); });
        express.on("confirm", async (event) => {
          if (busy.current || pending.current) { event.paymentFailed(); return; }
          busy.current = true;
          setError("");
          onLock(true);
          let uncertain = false;
          try {
            const submitted = await elements.submit();
            if (submitted.error) throw new Error(submitted.error.message || "Please check your wallet details.");
            const created = await stripe.createPaymentMethod({ elements });
            if (created.error) throw new Error(created.error.message || "The wallet could not authorize this payment.");

            // WooCommerce confirms this wallet-backed card using the same account
            // as the card form. It remains responsible for orders and webhooks.
            uncertain = true;
            const response = await fetch("/api/shop/checkout", {
              method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...checkout, payment_method: SHOP_STRIPE_METHOD,
                payment_data: [{ key: "fkwcs_source", value: created.paymentMethod.id }, { key: "payment_method", value: SHOP_STRIPE_METHOD }],
                expected_total: String(quote!.amount), wallet_currency: quote!.currency,
              }),
            });
            const result = await response.json() as WalletPaymentResponse;
            if (response.status < 500) uncertain = false;
            if (!response.ok) {
              if (response.status === 409) setQuote(null);
              throw new Error(result.message || "The wallet payment was not completed.");
            }
            if (result.stripeError) { uncertain = true; throw new Error(result.stripeError); }
            if (result.stripeAction) {
              pending.current = result.stripeAction;
              const confirmation = await stripe.handleNextAction({ clientSecret: result.stripeAction.clientSecret });
              if (confirmation.error) throw new Error(confirmation.error.message || "Please retry bank verification.");
              const intent = confirmation.paymentIntent || confirmation.setupIntent;
              if (!intent || !["succeeded", "requires_capture"].includes(intent.status)) throw new Error("Bank verification is not complete. Please retry verification.");
              setFinished(true);
              onFinished(true);
              window.location.assign(result.stripeAction.verificationUrl);
              return;
            }
            if (result.payment_result?.payment_status !== "success") throw new Error("The wallet payment was not completed.");
            setFinished(true);
            onFinished(true);
            if (result.payment_result.redirect_url) window.location.assign(result.payment_result.redirect_url);
            else await refreshCart();
          } catch (cause) {
            event.paymentFailed({ reason: "fail" });
            setError(uncertain
              ? "We could not confirm the payment status. Please contact the shop before paying again."
              : cause instanceof Error ? cause.message : "Wallet payment failed. Please try again.");
            if (pending.current) setRetryVerification(true);
            else if (uncertain) { setFinished(true); onFinished(true); }
            else onLock(false);
          } finally { busy.current = false; }
        });
        express.mount(container.current);
      } catch (cause) {
        if (!cancelled) { setAvailability("unavailable"); setError(cause instanceof Error ? cause.message : "Wallet payments could not load."); }
      }
    }
    void mountWallets();
    return () => { cancelled = true; express?.destroy(); };
  }, [secure, quote, publishableKey, checkout, onLock, onFinished, refreshCart]);

  return (
    <div className={styles.walletPayments}>
      <span className={styles.paymentLabel}>Apple Pay / Google Pay</span>
      {secure === false ? (
        <p className={styles.cardHelp}>Wallet payments require a secure connection. Please use card or PayPal on this page.</p>
      ) : !quote ? (
        <>
          <p className={styles.cardHelp}>Complete your details above to check available wallets and confirm your delivery total.</p>
          <button type="button" className={styles.paymentOption} onClick={() => void prepare()} disabled={disabled || preparing || !secure}>
            {preparing ? "Checking total..." : "Continue with Apple Pay or Google Pay"}
          </button>
        </>
      ) : null}
      <div ref={container} hidden={!quote || availability === "unavailable" || retryVerification || finished} />
      {quote && availability === "loading" ? <p className={styles.cardHelp} role="status">Checking available wallets...</p> : null}
      {quote && availability === "unavailable" ? <p className={styles.cardHelp}>Apple Pay and Google Pay aren’t available in this browser. Please use card or PayPal.</p> : null}
      {retryVerification && !finished ? <button type="button" className={styles.paymentOption} onClick={() => void verifyPending()}>Retry bank verification</button> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {finished && !error ? <p className={styles.success} role="status">Payment confirmed. Thank you for your order.</p> : null}
    </div>
  );
}
