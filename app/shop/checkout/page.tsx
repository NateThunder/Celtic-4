"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useShopCart } from "../../components/shop/ShopCartContext";
import styles from "./checkout.module.css";

type CheckoutMethodsPayload = {
  methods?: string[];
  defaultMethod?: string | null;
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

function isPayPalMethod(method: string): boolean {
  return /(^ppcp-gateway$)|paypal/i.test(method);
}

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
  const { items, totalLabel, totals, isLoading, refreshCart } = useShopCart();

  const [formValues, setFormValues] = useState<CheckoutFormValues>(DEFAULT_FORM_VALUES);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasMounted, setHasMounted] = useState(false);

  const canSubmit = useMemo(
    () => !isLoading && !isLoadingMethods && items.length > 0 && !!paymentMethod && !isSubmitting,
    [isLoading, isLoadingMethods, items.length, paymentMethod, isSubmitting],
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

        const methods = Array.isArray(payload.methods)
          ? payload.methods.filter((method): method is string => typeof method === "string" && method.length > 0)
          : [];
        const paypalMethods = methods.filter((method) => isPayPalMethod(method));

        if (isCancelled) return;

        setPaymentMethods(paypalMethods);
        const defaultMethod = payload.defaultMethod && paypalMethods.includes(payload.defaultMethod)
          ? payload.defaultMethod
          : paypalMethods[0] || "";
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
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

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
          payment_data: [],
        }),
      });

      const payload = (await response.json().catch(() => null)) as CheckoutResponsePayload | null;
      if (!response.ok || !payload) {
        throw new Error(getMessageFromPayload(payload, `Checkout failed (${response.status}).`));
      }

      await refreshCart();

      const redirectUrl = payload.payment_result?.redirect_url?.trim();
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

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
          {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

          <div className={styles.layout}>
            <form className={styles.form} onSubmit={handleSubmit}>
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

                <div className={styles.paymentField}>
                  <span className={styles.paymentLabel}>Payment method</span>
                  <div className={styles.paymentGrid}>
                    <button
                      type="button"
                      className={`${styles.paymentOption}${
                        paymentMethod === paypalMethod ? ` ${styles.paymentOptionSelected}` : ""
                      }`}
                      onClick={() => {
                        if (paypalMethod) setPaymentMethod(paypalMethod);
                      }}
                      disabled={isLoadingMethods || !paypalMethod}
                    >
                      <span className={styles.paypalMark}>
                        <Image className={styles.paypalLogo} src="/paypal-logo.svg" alt="PayPal" width={129} height={32} />
                      </span>
                    </button>
                  </div>
                </div>

                <label className={styles.field}>
                  <span>Order note (optional)</span>
                  <textarea
                    rows={3}
                    value={formValues.note}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, note: event.target.value }))}
                  />
                </label>

                <button type="submit" className={styles.submitButton} disabled={!canSubmit}>
                  {isSubmitting ? "Processing..." : `Pay ${totalLabel}`}
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
