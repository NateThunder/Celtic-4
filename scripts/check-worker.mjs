import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import fixture from "../data/woo-products.json" with { type: "json" };

const request = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, Connection: "close" } });
const origin = process.argv[2] || "http://127.0.0.1:8787";
const password = (await readFile(".dev.vars", "utf8")).match(/^ADMIN_PASSWORD=(.+)$/m)?.[1];
const authorization = `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`;
for (const route of ["/", "/about", "/music", "/music/charts", "/shop", "/contact"]) {
  const response = await request(origin + route);
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.ok(html.includes("Celtic"), route);
  console.log(`OK ${route}`);
}
const shop = await (await request(origin + "/shop?fixture-check=1")).text();
assert.ok(!shop.includes("Unable to load products"), "shop catalogue fallback");
for (const product of fixture.products) assert.ok(shop.includes(`/shop/${product.id}`), `shop product ${product.id}`);
const detail = await request(origin + `/shop/${fixture.products[0].id}`);
assert.equal(detail.status, 200, "fixture product detail");
assert.ok((await detail.text()).includes(fixture.products[0].name), "fixture product name");
console.log(`OK complete ${fixture.products.length}-product fixture catalogue and product detail`);
for (const route of ["/api/shop/cart", "/api/shop/cart/add-item", "/api/shop/checkout", "/api/shop/checkout/prepare", "/api/stems/checkout"]) {
  const response = await request(origin + route, { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
  assert.equal(response.status, 503, route);
  assert.match(await response.text(), /disabled/);
  console.log(`Blocked commerce ${route}`);
}
assert.match(await (await request(origin + "/shop/cart")).text(), /Loading cart/);
assert.match(await (await request(origin + "/shop/checkout")).text(), /Checkout/);
for (const route of ["/admin", "/admin/stems", "/api/admin/stems"]) {
  assert.equal((await request(origin + route)).status, 401, route);
}
const tracksResponse = await request(origin + "/api/admin/stems", { headers: { authorization } });
assert.equal(tracksResponse.status, 200, "authenticated admin");
const { tracks } = await tracksResponse.json();
assert.ok(tracks.length >= 2, "migrated tracks");
const audio = await request(origin + tracks[0].stems[0].fileUrl, { headers: { Range: "bytes=0-99" } });
assert.equal(audio.status, 206, "audio seeking");
const audioLength = (await audio.arrayBuffer()).byteLength;
assert.ok(audioLength > 0 && audioLength <= 100, "bounded audio range");
const rejected = await request(origin + "/api/admin/stems", { method: "POST", headers: { authorization }, body: "invalid" });
assert.equal(rejected.status, 403, "cross-origin writes rejected");
console.log(`OK admin authentication, ${tracks.length} migrated sessions, R2 audio range requests, and CSRF protection`);

