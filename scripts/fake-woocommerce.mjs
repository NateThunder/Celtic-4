// A stand-in for the WooCommerce Store API, used only to test pull requests.
//
// It serves a read-only copy of the real catalogue (made by the workflow's
// "Copy the real catalogue" job)
// and keeps carts in memory, so pull request tests do not use the real shop's
// carts. (The workflow also blocks the real shop to catch accidental calls.)
//
// Its add-to-cart rules copy what the real store does, including the one that
// broke sheet music on 18 Nov 2026: an option's value must match the stored value
// exactly ("Complete", not "complete"; "s" for a size slug). If the real store
// rejects something, this should too.
//
// Run:  node scripts/fake-woocommerce.mjs <snapshot-folder>   (listens on 127.0.0.1:4000)

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";

const snapshot = JSON.parse(readFileSync(join(process.argv[2] || ".", "catalogue.json"), "utf8"));
const { products, categories, variations } = snapshot;
const PORT = Number(process.env.FAKE_WOO_PORT || 4000);
const carts = new Map(); // cart token -> items

const productById = new Map(products.map((product) => [product.id, product]));
const variationById = new Map(Object.values(variations).flat().map((variation) => [variation.id, variation]));
const normName = (value) => String(value ?? "").trim().toLowerCase().replace(/^attribute_/, "").replace(/^pa_/, "").replace(/[\s_-]+/g, "");

function send(res, status, body, token) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", Nonce: "fake-nonce" };
  if (token) headers["Cart-Token"] = token;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function cartBody(items) {
  const total = items.reduce((sum, item) => sum + Number(item.prices?.price || 0) * item.quantity, 0);
  return {
    items,
    items_count: items.reduce((sum, item) => sum + item.quantity, 0),
    totals: { currency_code: "GBP", currency_symbol: "£", currency_minor_unit: 2, total_items: String(total), total_price: String(total), total_shipping: "0", total_fees: "0", total_tax: "0", total_discount: "0" },
  };
}

// Pages like the real Store API: per_page defaults to 10 (max 100), page from 1,
// with X-WP-Total and X-WP-TotalPages headers, and an empty list past the end.
function sendPage(res, url, list) {
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") || 10)));
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  res.setHeader("X-WP-Total", String(list.length));
  res.setHeader("X-WP-TotalPages", String(Math.max(1, Math.ceil(list.length / perPage))));
  send(res, 200, list.slice((page - 1) * perPage, page * perPage));
}

function error(res, token, code, message) {
  send(res, 400, { code, message, data: { status: 400 } }, token);
}

function addItem(res, token, items, body) {
  const id = Number(body.id);
  const quantity = Math.max(1, Math.round(Number(body.quantity ?? 1)));
  const record = productById.get(id) || variationById.get(id);
  if (!record) return error(res, token, "woocommerce_rest_cart_invalid_product", "This product cannot be added to the cart.");
  if (record.is_in_stock !== true || record.is_purchasable !== true) {
    return error(res, token, "woocommerce_rest_product_out_of_stock", `You cannot add "${record.name}" to the cart because the product is out of stock.`);
  }

  let variation = [];
  if (record.type === "variation" || variationById.has(id)) {
    const parent = products.find((product) => (product.variations || []).some((summary) => summary.id === id));
    if (!parent) return error(res, token, "woocommerce_rest_cart_invalid_product", "This product cannot be added to the cart.");
    const stored = parent.variations.find((summary) => summary.id === id).attributes || [];
    const posted = Array.isArray(body.variation) ? body.variation : [];
    for (const attribute of (parent.attributes || []).filter((candidate) => candidate.has_variations)) {
      const want = stored.find((entry) => normName(entry.name) === normName(attribute.name));
      const got = posted.find((entry) => normName(entry.attribute) === normName(attribute.taxonomy || attribute.name));
      const allowed = (attribute.terms || []).map((term) => (attribute.taxonomy ? term.slug : term.name));
      if (!got || !want || got.value !== want.value) {
        return error(res, token, "woocommerce_rest_invalid_variation_data", `Invalid value posted for ${attribute.name}. Allowed values: ${allowed.join(", ")}`);
      }
      variation.push({ raw_attribute: `attribute_${attribute.taxonomy || attribute.name.toLowerCase()}`, attribute: attribute.name, value: got.value });
    }
  }

  const existing = items.find((item) => item.id === id);
  if (existing) existing.quantity += quantity;
  else items.push({ key: randomUUID().replace(/-/g, ""), id, type: record.type || "simple", name: record.name, quantity, variation, prices: record.prices || {} });
  send(res, 201, cartBody(items), token);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname.replace(/^\/wp-json\/wc\/store\/v1/, "");
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};

  // ---- Catalogue (read-only copy)
  if (req.method === "GET" && path === "/products") {
    const list = url.searchParams.get("type") === "variation" ? variations[url.searchParams.get("parent")] || [] : products;
    return sendPage(res, url, list);
  }
  if (req.method === "GET" && path === "/products/categories") return sendPage(res, url, categories);
  const single = /^\/products\/(\d+)$/.exec(path);
  if (req.method === "GET" && single) {
    const record = productById.get(Number(single[1])) || variationById.get(Number(single[1]));
    return record ? send(res, 200, record) : send(res, 404, { code: "woocommerce_rest_product_invalid_id", message: "Invalid ID." });
  }

  // ---- Carts (in memory, one per cart token, like the real Store API)
  if (path.startsWith("/cart")) {
    let token = req.headers["cart-token"];
    if (!token || !carts.has(token)) { token = randomUUID(); carts.set(token, []); }
    const items = carts.get(token);
    if (req.method === "GET" && path === "/cart") return send(res, 200, cartBody(items), token);
    if (req.method === "POST" && path === "/cart/add-item") return addItem(res, token, items, body);
    if (req.method === "POST" && path === "/cart/remove-item") {
      const index = items.findIndex((item) => item.key === body.key);
      if (index < 0) return error(res, token, "woocommerce_rest_cart_invalid_key", "Cart item does not exist.");
      items.splice(index, 1);
      return send(res, 200, cartBody(items), token);
    }
    if (req.method === "POST" && path === "/cart/update-item") {
      const item = items.find((candidate) => candidate.key === body.key);
      if (!item) return error(res, token, "woocommerce_rest_cart_invalid_key", "Cart item does not exist.");
      item.quantity = Math.max(1, Math.round(Number(body.quantity)));
      return send(res, 200, cartBody(items), token);
    }
    if (req.method === "POST" && path === "/cart/update-customer") return send(res, 200, cartBody(items), token);
  }

  send(res, 404, { code: "rest_no_route", message: "Not handled by the fake WooCommerce." });
}).listen(PORT, "127.0.0.1", () => console.log(`Fake WooCommerce on 127.0.0.1:${PORT}: ${products.length} products (copy taken ${snapshot.takenAt})`));
