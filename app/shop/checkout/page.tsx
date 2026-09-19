"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useShopCart } from "../../components/shop/ShopCartContext";
import ShopStripeCard, { type ShopStripeCardHandle } from "../../components/shop/ShopStripeCard";
import ShopWalletPayments from "../../components/shop/ShopWalletPayments";
import { getShopPaymentMethods, isPayPalMethod, SHOP_STRIPE_METHOD, type ShopStripeAction } from "../../lib/shopPayments";
import styles from "./checkout.module.css";
import { COMMERCE_DISABLED } from "../../lib/shopConfig";

type CheckoutMethodsPayload = {
  methods?: string[];
  defaultMethod?: string | null;
  stripe?: { publishableKey: string } | null;
  stripeError?: string | null;
};

type CheckoutPaymentResult = {
  redirect_url?: string;
  payment_status?: string;
};

type CheckoutResponsePayload = {
  payment_result?: CheckoutPaymentResult;
  message?: string;
  code?: string;
  order_id?: number;
  order_number?: string;
  stripeAction?: ShopStripeAction | null;
  stripeError?: string;
};

type CheckoutFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  note: string;
};

type CountryOption = {
  code: string;
};

const DEFAULT_FORM_VALUES: CheckoutFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postcode: "",
  country: "GB",
  note: "",
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "GB" },
  { code: "US" },
  { code: "IE" },
  { code: "CA" },
  { code: "AU" },
];

function getMessageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  if ("message" in payload && typeof (payload as { message?: unknown }).message === "string") {
    return String((payload as { message: string }).message);
  }
  return fallback;
}

export default function ShopCheckoutPage() {
  const { items, totalLabel, totals, isLoading, refreshCart, error: cartError } = useShopCart();

  const [formValues, setFormValues] = useState<CheckoutFormValues>(DEFAULT_FORM_VALUES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasMounted, setHasMounted] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [stripeError, setStripeError] = useState("");
  const [cardReady, setCardReady] = useState(false);
  const [pendingStripeAction, setPendingStripeAction] = useState<ShopStripeAction | null>(null);
  const [paymentFinished, setPaymentFinished] = useState(false);
  const cardRef = useRef<ShopStripeCardHandle>(null);
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [walletLocked, setWalletLocked] = useState(false);
  const [reviewedQuote, setReviewedQuote] = useState<{ key: string; total: string } | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const isStripe = paymentMethod === SHOP_STRIPE_METHOD;
  const walletCheckout = useMemo(() => {
    const billing = {
      first_name: formValues.firstName.trim(), last_name: formValues.lastName.trim(),
      email: formValues.email.trim(), phone: formValues.phone.trim(), company: formValues.company.trim(),
      address_1: formValues.address1.trim(), address_2: formValues.address2.trim(), city: formValues.city.trim(),
      state: formValues.state.trim(), postcode: formValues.postcode.trim(), country: formValues.country,
    };
    const { email, ...shipping } = billing;
    void email;
    return { billing_address: billing, shipping_address: shipping, customer_note: formValues.note.trim() };
  }, [formValues]);
  const quoteKey = JSON.stringify([walletCheckout, items.map(item => [item.key, item.quantity]), totalLabel]);
  const quoteReady = reviewedQuote?.key === quoteKey;

  async function reviewDelivery() {
    if (!formRef.current?.reportValidity()) return;
    setIsReviewing(true);
    setReviewedQuote(null);
    setErrorMessage("");
    try {
      const response = await fetch("/api/shop/cart/update-customer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walletCheckout),
      });
      const cart = await response.json() as {
        needs_shipping?: boolean;
        shipping_rates?: { shipping_rates?: { selected?: boolean }[] }[];
        totals: { currency_code: string; currency_minor_unit: number; total_price: string };
      };
      if (!response.ok) throw new Error(getMessageFromPayload(cart, "Unable to calculate delivery."));
      if (cart.needs_shipping && (!cart.shipping_rates?.length || cart.shipping_rates.some((group: { shipping_rates?: { selected?: boolean }[] }) => !group.shipping_rates?.some(rate => rate.selected)))) {
        throw new Error("No delivery service is available for this address. Please check your address or contact the shop.");
      }
      await refreshCart();
      const money = new Intl.NumberFormat(undefined, { style: "currency", currency: cart.totals.currency_code }).format(Number(cart.totals.total_price) / 10 ** cart.totals.currency_minor_unit);
      setReviewedQuote({ key: JSON.stringify([walletCheckout, items.map(item => [item.key, item.quantity]), money]), total: cart.totals.total_price });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to calculate delivery.");
    } finally { setIsReviewing(false); }
  }

  const canSubmit = useMemo(
    () => !COMMERCE_DISABLED && !cartError && !isReviewing && (quoteReady || !!pendingStripeAction) && !isLoading && !isLoadingMethods && (items.length > 0 || !!pendingStripeAction) && !!paymentMethod
      && !isSubmitting && !paymentFinished && !walletLocked && (!isStripe || cardReady),
    [cartError, isReviewing, quoteReady, isLoading, isLoadingMethods, items.length, paymentMethod, isSubmitting, paymentFinished, isStripe, cardReady, pendingStripeAction, walletLocked],
  );

  const paypalMethod = useMemo(
    () => paymentMethods.find((method) => isPayPalMethod(method)) || "",
    [paymentMethods],
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  function openHostedCheckoutPopup(url: string): boolean {
    const openedPopup = window.open(url, "celtic_payment_popup", "popup,width=520,height=740");
    if (!openedPopup) {
      window.location.assign(url);
      return false;
    }
    return true;
  }

  useEffect(() => {
    let isCancelled = false;
    if (isLoading || cartError) return;

    async function loadMethods() {
      setIsLoadingMethods(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/shop/checkout/methods", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as CheckoutMethodsPayload | null;

        if (!response.ok || !payload) {
          throw new Error(getMessageFromPayload(payload, `Unable to load payment methods (${response.status}).`));
        }

        const methods = getShopPaymentMethods(payload.methods);

        if (isCancelled) return;

        setPaymentMethods(methods);
        setStripeKey(payload.stripe?.publishableKey || "");
        setStripeError(payload.stripeError || "");
        const defaultMethod = payload.defaultMethod && methods.includes(payload.defaultMethod)
          ? payload.defaultMethod
          : methods.find((method) => method !== SHOP_STRIPE_METHOD || payload.stripe?.publishableKey) || "";
        setPaymentMethod(defaultMethod);
      } catch (error) {
        if (isCancelled) return;
        setPaymentMethods([]);
        setPaymentMethod("");
        setErrorMessage(error instanceof Error ? error.message : "Unable to load payment methods.");
      } finally {
        if (!isCancelled) {
          setIsLoadingMethods(false);
        }
      }
    }

    void loadMethods();
    return () => {
      isCancelled = true;
    };
  }, [isLoading, cartError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const billingAddress = {
        first_name: formValues.firstName.trim(),
        last_name: formValues.lastName.trim(),
        company: formValues.company.trim(),
        address_1: formValues.address1.trim(),
        address_2: formValues.address2.trim(),
        city: formValues.city.trim(),
        state: formValues.state.trim(),
        postcode: formValues.postcode.trim(),
        country: formValues.country.trim().toUpperCase(),
        phone: formValues.phone.trim(),
        email: formValues.email.trim(),
      };

      const shippingAddress = {
        first_name: billingAddress.first_name,
        last_name: billingAddress.last_name,
        company: billingAddress.company,
        address_1: billingAddress.address_1,
        address_2: billingAddress.address_2,
        city: billingAddress.city,
        state: billingAddress.state,
        postcode: billingAddress.postcode,
        country: billingAddress.country,
        phone: billingAddress.phone,
      };

      const stripeBilling = {
        name: `${billingAddress.first_name} ${billingAddress.last_name}`.trim(),
        email: billingAddress.email,
        phone: billingAddress.phone || undefined,
        address: {
          line1: billingAddress.address_1, line2: billingAddress.address_2,
          city: billingAddress.city, state: billingAddress.state,
          postal_code: billingAddress.postcode, country: billingAddress.country,
        },
      };
      if (pendingStripeAction) {
        if (!cardRef.current) throw new Error("Please wait for the card form to load.");
        await cardRef.current.confirm(pendingStripeAction, stripeBilling);
        setPaymentFinished(true);
        window.location.assign(pendingStripeAction.verificationUrl);
        return;
      }
      const paymentData: { key: string; value: string }[] = [];
      if (isStripe) {
        if (!cardRef.current) throw new Error("Please wait for the card form to load.");
        const source = await cardRef.current.createPaymentMethod(stripeBilling);
        paymentData.push({ key: "fkwcs_source", value: source }, { key: "payment_method", value: SHOP_STRIPE_METHOD });
      }

      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          billing_address: billingAddress,
          shipping_address: shippingAddress,
          customer_note: formValues.note.trim(),
          payment_method: paymentMethod,
          payment_data: paymentData,
          expected_total: reviewedQuote?.total,
        }),
      }).catch(() => {
        setPaymentFinished(true);
        throw new Error("The connection was interrupted while placing your order. Please contact the shop to confirm its status before paying again.");
      });

      const payload = (await response.json().catch(() => null)) as CheckoutResponsePayload | null;
      if (!response.ok || !payload) {
        throw new Error(getMessageFromPayload(payload, `Checkout failed (${response.status}).`));
      }

      if (payload.stripeError) {
        setPaymentFinished(true);
        throw new Error(payload.stripeError);
      }
      if (payload.stripeAction) {
        setPendingStripeAction(payload.stripeAction);
        if (!cardRef.current) throw new Error("Please wait for the card form to load.");
        await cardRef.current.confirm(payload.stripeAction, stripeBilling);
        setPaymentFinished(true);
        window.location.assign(payload.stripeAction.verificationUrl);
        return;
      }

      const redirectUrl = payload.payment_result?.redirect_url?.trim();
      if (isStripe) {
        if (payload.payment_result?.payment_status !== "success") {
          throw new Error("The card payment was not completed. Please check your details and try again.");
        }
        setPaymentFinished(true);
        setSuccessMessage("Payment confirmed. Thank you for your order.");
        await refreshCart();
        if (redirectUrl) window.location.assign(redirectUrl);
        return;
      }
      await refreshCart();
      if (redirectUrl) {
        const opened = openHostedCheckoutPopup(redirectUrl);
        if (!opened) {
          return;
        }

        const orderLabel = payload.order_number || payload.order_id;
        setSuccessMessage(
          orderLabel
            ? `Order ${orderLabel} created. Complete payment in the popup window.`
            : "Order created. Complete payment in the popup window.",
        );
        return;
      }

      const orderLabel = payload.order_number || payload.order_id;
      setSuccessMessage(
        orderLabel
          ? `Order ${orderLabel} created successfully.`
          : "Checkout completed, but no redirect URL was returned by the payment gateway.",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete checkout.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!hasMounted) {
    return (
      <div className="site-shell">
        <main className={styles.page}>
          <section className={styles.shell}>
            <header className={styles.header}>
              <h1 className={styles.title}>Checkout</h1>
              <div className={styles.nav}>
                <Link className={styles.navLink} href="/shop/cart">
                  Back to Cart
                </Link>
              </div>
            </header>
            <p className={styles.status}>Loading checkout...</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <h1 className={styles.title}>Checkout</h1>
            <div className={styles.nav}>
              <Link className={styles.navLink} href="/shop/cart">
                Back to Cart
              </Link>
            </div>
          </header>

          {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}
          {cartError ? <p className={styles.error} role="alert">{cartError}</p> : null}
          {successMessage ? <p className={styles.success} role="status">{successMessage}</p> : null}

          <div className={styles.layout}>
            <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
              <fieldset className={styles.checkoutFields} disabled={walletLocked}>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>First name</span>
                    <input
                      type="text"
                      required
                      value={formValues.firstName}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, firstName: event.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Last name</span>
                    <input
                      type="text"
                      required
                      value={formValues.lastName}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, lastName: event.target.value }))}
                    />
                  </label>
                </div>

                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Email</span>
                    <input
                      type="email"
                      required
                      value={formValues.email}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Phone</span>
                    <input
                      type="tel"
                      required
                      value={formValues.phone}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, phone: event.target.value }))}
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span>Company (optional)</span>
                  <input
                    value={formValues.company}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, company: event.target.value }))}
                  />
                </label>

                <label className={styles.field}>
                  <span>Address line 1</span>
                  <input
                    type="text"
                    required
                    value={formValues.address1}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, address1: event.target.value }))}
                  />
                </label>

                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>City</span>
                    <input
                      type="text"
                      required
                      value={formValues.city}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, city: event.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>State/County</span>
                    <input
                      type="text"
                      required
                      value={formValues.state}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, state: event.target.value }))}
                    />
                  </label>
                </div>

                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Postcode</span>
                    <input
                      type="text"
                      required
                      value={formValues.postcode}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, postcode: event.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Country code</span>
                    <select
                      required
                      value={formValues.country}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, country: event.target.value }))}
                    >
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.code}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

              </fieldset>
                <div className={styles.paymentField}>
                  <span className={styles.paymentLabel}>Payment method</span>
                  <div className={styles.paymentGrid}>
                    {paymentMethods.includes(SHOP_STRIPE_METHOD) ? (
                      <button type="button"
                        className={`${styles.paymentOption}${isStripe ? ` ${styles.paymentOptionSelected}` : ""}`}
                        aria-pressed={isStripe}
                        onClick={() => setPaymentMethod(SHOP_STRIPE_METHOD)}
                        disabled={!stripeKey || isSubmitting || paymentFinished || !!pendingStripeAction || walletLocked}
                      >
                        <span className={styles.cardGlyph} aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <rect x="2" y="4" width="20" height="16" rx="3" />
                            <path d="M2 9h20M6 15h4" />
                          </svg>
                        </span>
                        <span className={styles.cardText}>Credit / debit card</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`${styles.paymentOption}${
                        paymentMethod === paypalMethod ? ` ${styles.paymentOptionSelected}` : ""
                      }`}
                      onClick={() => {
                        if (paypalMethod) setPaymentMethod(paypalMethod);
                      }}
                      aria-pressed={!!paypalMethod && paymentMethod === paypalMethod}
                      disabled={isLoadingMethods || !paypalMethod || isSubmitting || paymentFinished || !!pendingStripeAction || walletLocked}
                    >
                      <span className={styles.paypalMark}>
                        <Image className={styles.paypalLogo} src="/paypal-logo.svg" alt="PayPal" width={129} height={32} />
                      </span>
                    </button>
                  </div>
                  {stripeError ? <p className={styles.error} role="status">{stripeError}</p> : null}
                  {isStripe && stripeKey ? <ShopStripeCard key={stripeKey} ref={cardRef} publishableKey={stripeKey} onReady={setCardReady} /> : null}
                  {!isLoadingMethods && paymentMethods.length === 0 ? <p className={styles.error}>No payment methods are currently available.</p> : null}
                  {stripeKey ? <ShopWalletPayments
                    key={JSON.stringify([walletCheckout, items.map((item) => [item.key, item.quantity])])}
                    publishableKey={stripeKey} checkout={walletCheckout}
                    disabled={COMMERCE_DISABLED || !quoteReady || !!cartError || isReviewing || isLoading || isSubmitting || paymentFinished || !!pendingStripeAction || items.length === 0}
                    validate={() => formRef.current?.reportValidity() ?? false}
                    refreshCart={refreshCart} onLock={setWalletLocked} onFinished={setPaymentFinished}
                  /> : null}
                </div>

                <label className={styles.field}>
                  <span>Order note (optional)</span>
                  <textarea
                    disabled={walletLocked}
                    rows={3}
                    value={formValues.note}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, note: event.target.value }))}
                  />
                </label>

                <button type="button" className={styles.submitButton} onClick={reviewDelivery} disabled={isReviewing || isLoading || isSubmitting || walletLocked || paymentFinished || !!pendingStripeAction || !items.length}>
                  {isReviewing ? "Calculating delivery..." : "Review delivery and total"}
                </button>
                {!quoteReady ? <p>Complete your address and review delivery before paying.</p> : null}
                <button type="submit" className={styles.submitButton} disabled={!canSubmit}>
                  {isSubmitting ? "Processing..." : paymentFinished ? "Order submitted" : pendingStripeAction ? "Retry card verification" : `Pay ${totalLabel}`}
                </button>
            </form>

            <aside className={styles.summary}>
              <h2 className={styles.summaryTitle}>Order Summary</h2>
              <ul className={styles.summaryList}>
                {items.length > 0 ? (
                  items.map((item) => (
                    <li key={item.key} className={styles.summaryItem}>
                      <span className={styles.summaryItemMeta}>
                        <span>{item.name}</span>
                        {item.variationLabel ? (
                          <span className={styles.summaryItemOptions}>{item.variationLabel}</span>
                        ) : null}
                      </span>
                      <span>
                        {item.quantity} x {item.price}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className={styles.summaryEmpty}>{isLoading ? "Loading order..." : "Your cart is empty."}</li>
                )}
              </ul>
              {items.length > 0 ? (
                <div className={styles.summaryCharges}>
                  <div className={styles.summaryChargeRow}>
                    <span>Subtotal</span>
                    <span>{totals.subtotalLabel}</span>
                  </div>
                  {totals.hasDiscount ? (
                    <div className={styles.summaryChargeRow}>
                      <span>Discount</span>
                      <span>{totals.discountLabel}</span>
                    </div>
                  ) : null}
                  {totals.hasShipping ? (
                    <div className={styles.summaryChargeRow}>
                      <span>Shipping</span>
                      <span>{totals.shippingLabel}</span>
                    </div>
                  ) : null}
                  {totals.hasFees ? (
                    <div className={styles.summaryChargeRow}>
                      <span>Fees</span>
                      <span>{totals.feesLabel}</span>
                    </div>
                  ) : null}
                  <div className={styles.summaryChargeRow}>
                    <span>Tax</span>
                    <span>{totals.taxLabel}</span>
                  </div>
                </div>
              ) : null}
              <p className={styles.summaryTotal}>Total: {totalLabel}</p>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
