import test from "node:test";
import assert from "node:assert/strict";
import { getShopPaymentMethods, getShopStripeAction, getShopWalletQuote } from "../app/lib/shopPayments.ts";

const woo = "https://shop.example.com";

test("wallet quote uses WooCommerce's final total in minor units", () => {
  assert.deepEqual(getShopWalletQuote({ totals: { total_items: "1000", total_shipping: "300", total_tax: "260", total_price: "1560", currency_code: "GBP" } }), { amount: 1560, currency: "gbp" });
});

test("wallet quote rejects empty, malformed and unsafe totals", () => {
  for (const total_price of ["0", "-1", "1.99", "NaN", "", "9007199254740992", undefined, 100]) {
    assert.throws(() => getShopWalletQuote({ totals: { total_price, currency_code: "GBP" } }));
  }
  assert.throws(() => getShopWalletQuote(null));
  assert.throws(() => getShopWalletQuote({ totals: { total_price: "100", currency_code: "" } }));
});
const receipt = `${woo}/checkout/order-received/42/?key=wc_order_example`;
const challenge = {
  order_id: 42,
  order_key: "wc_order_example",
  payment_result: {
    payment_status: "success",
    redirect_url: "",
    payment_details: [
      { key: "result", value: "success" },
      { key: "fkwcs_redirect", value: receipt },
      { key: "fkwcs_intent_secret", value: "pi_example_secret_example" },
      { key: "save_card", value: false },
    ],
  },
};

test("exposes available card and PayPal gateways without enabling wallets or disabled methods", () => {
  assert.deepEqual(getShopPaymentMethods(["ppcp-gateway", "fkwcs_stripe_apple_pay", "fkwcs_stripe", "fkwcs_stripe", "cod", null]), ["fkwcs_stripe", "ppcp-gateway"]);
  assert.deepEqual(getShopPaymentMethods(["ppcp-gateway"]), ["ppcp-gateway"]);
  assert.deepEqual(getShopPaymentMethods([]), []);
  assert.deepEqual(getShopPaymentMethods(undefined), []);
});

test("Store API success requiring 3DS produces a confirmation action, not a paid result", () => {
  const action = getShopStripeAction(challenge, woo);
  assert.equal(action.kind, "payment");
  assert.equal(action.clientSecret, "pi_example_secret_example");
  const url = new URL(action.verificationUrl);
  assert.equal(url.origin, woo);
  assert.equal(url.searchParams.get("wc-ajax"), "fkwcs_stripe_verify_payment_intent");
  assert.equal(url.searchParams.get("order"), "42");
  assert.equal(url.searchParams.get("order_key"), "wc_order_example");
  assert.equal(url.searchParams.get("fkwcs_redirect_to"), receipt);
  assert.equal(url.searchParams.has("save_card"), false);
});

test("ordinary paid and declined responses do not request card confirmation", () => {
  for (const status of ["success", "failure", "error"]) {
    assert.equal(getShopStripeAction({ payment_result: { payment_status: status, redirect_url: receipt, payment_details: [{ key: "result", value: status }] } }, woo), null);
  }
});

test("incomplete authentication response fails closed", () => {
  assert.throws(() => getShopStripeAction({ ...challenge, order_key: undefined }, woo), /incomplete/);
  assert.throws(() => getShopStripeAction({ ...challenge, order_id: undefined }, woo), /incomplete/);
});

test("rejects an external or executable receipt URL", () => {
  for (const badUrl of ["https://evil.example/", "//evil.example/", "javascript:alert(1)", "https://name:password@shop.example.com/"]) {
    const payload = structuredClone(challenge);
    payload.payment_result.payment_details[1].value = badUrl;
    assert.throws(() => getShopStripeAction(payload, woo), /Invalid/);
  }
});

test("supports FunnelKit classic confirmation fragments", () => {
  const url = `${woo}/?wc-ajax=fkwcs_stripe_verify_payment_intent&gateway=fkwcs_stripe&order=42&order_key=wc_order_example`;
  const action = getShopStripeAction({ payment_result: { redirect_url: `#fkwcs-confirm-pi-pi_example_secret_example:${encodeURIComponent(url)}:42:fkwcs_stripe:no` } }, woo);
  assert.deepEqual(action, { kind: "payment", clientSecret: "pi_example_secret_example", verificationUrl: url });
});

test("rejects malformed or untrusted confirmation fragments", () => {
  for (const value of ["#fkwcs-confirm-broken", `#fkwcs-confirm-pi-secret:${encodeURIComponent("https://evil.example/")}`, `#fkwcs-confirm-pi-secret:${encodeURIComponent(woo + "/?wc-ajax=other")}`]) {
    assert.throws(() => getShopStripeAction({ payment_result: { redirect_url: value } }, woo));
  }
});

test("setup intents use setup confirmation", () => {
  const payload = structuredClone(challenge);
  payload.payment_result.payment_details[2] = { key: "fkwcs_setup_intent_secret", value: "seti_example_secret_example" };
  assert.equal(getShopStripeAction(payload, woo).kind, "setup");
});
