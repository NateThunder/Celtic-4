// Secret shopper for celticworship.co.uk.
//
// Visits the live shop the way a customer would and fails loudly if anything a
// customer needs is broken. It checks, in order:
//   1. The site is reading live WooCommerce data (not an old saved copy).
//   2. The site being tested is the exact version we expect (EXPECT_COMMIT), so a
//      failed deploy, or testing the old live site, can never pass as a success.
//   3. Every product that is for sale in WooCommerce appears on /shop.
//   4. On every product page, every in-stock option can be chosen and added to
//      the cart, the cart then really contains that item, and sizes are shown
//      smallest to largest.
//
// Safety:
// - It never opens checkout or pays, so it creates no orders and holds no stock
//   (WooCommerce only holds stock once checkout starts).
// - Every single test (each product, and each option of a product) runs as a
//   brand-new visitor with no cookies. The site's cart endpoints only ever act on
//   the cart named in the visitor's own cart cookie, so the shopper can only
//   touch the cart it created itself, never a customer's.
// - It checks that cart is empty before adding, and that it is empty again after.
//   If emptying fails, that test fails; nothing is ignored.
//
// Run:  node scripts/secret-shopper.mjs
// Env:  SITE_URL (default https://celticworship.co.uk)
//       WOO_URL  (default https://cms.celticworship.co.uk)
//       EXPECT_COMMIT (full commit hash the site under test must report)

import { appendFileSync } from "node:fs";
import { chromium } from "playwright";

const SITE = (process.env.SITE_URL || "https://celticworship.co.uk").replace(/\/$/, "");
const WOO = (process.env.WOO_URL || "https://cms.celticworship.co.uk").replace(/\/$/, "");
const EXPECT_COMMIT = process.env.EXPECT_COMMIT || "";
const SIZE_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "2xl", "xxxl", "3xl", "4xl", "5xl"];

const problems = [];
const passes = [];
const fail = (message) => { problems.push(message); console.log(`FAIL  ${message}`); };
const pass = (message) => { passes.push(message); console.log(`ok    ${message}`); };
const norm = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, "-");
const REQUEST_TIMEOUT_MS = 20_000;
const coverage = { products: 0, options: 0 };

// Thrown when something looks unsafe (for example a "new" visitor's cart is not
// empty). The whole run stops at once and changes nothing else.
class StopEverything extends Error {}

async function getJson(url) {
  const busted = `${url}${url.includes("?") ? "&" : "?"}_shopper=${Date.now()}`;
  const response = await fetch(busted, { headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

// Reads every page of a WooCommerce list, not just the first 100.
async function getAllPages(url) {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = await getJson(`${url}${url.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error(`${url} did not return a list`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
  throw new Error(`${url} has more than 2,000 items; the shopper stopped to be safe`);
}

// ---- 1 and 2: live data and the right version -----------------------------------
async function checkStatus() {
  const status = await getJson(`${SITE}/api/internal/catalog-status`);
  if (status.source === "live" && !status.lastError) pass(`shop is reading live WooCommerce data (${status.productCount} products)`);
  else fail(`shop is NOT reading live data: source=${status.source}, error=${status.lastError}`);

  if (EXPECT_COMMIT) {
    if (status.commit === EXPECT_COMMIT) pass(`testing the expected version ${EXPECT_COMMIT.slice(0, 7)}`);
    else throw new StopEverything(`site under test is version ${String(status.commit).slice(0, 7)}, expected ${EXPECT_COMMIT.slice(0, 7)}; stopping so an old version can't pass as the new one`);
  }
}

// Run again after shopping: if a newer deploy replaced the site mid-test, these
// results can't be trusted for this version (that newer version gets its own run).
async function checkVersionUnchanged() {
  if (!EXPECT_COMMIT) return;
  const status = await getJson(`${SITE}/api/internal/catalog-status`);
  if (status.commit === EXPECT_COMMIT) pass(`still the same version ${EXPECT_COMMIT.slice(0, 7)} after shopping`);
  else fail(`the site changed to version ${String(status.commit).slice(0, 7)} during the test, so these results don't prove ${EXPECT_COMMIT.slice(0, 7)} works`);
}

// ---- What WooCommerce says is for sale --------------------------------------
async function loadCatalog() {
  const products = await getAllPages(`${WOO}/wp-json/wc/store/v1/products`);
  if (products.length === 0) throw new StopEverything("WooCommerce returned no products at all, so nothing could be tested");
  for (const product of products) {
    if (typeof product.is_purchasable !== "boolean" || typeof product.is_in_stock !== "boolean" || !["simple", "variable"].includes(product.type)) {
      fail(`"${product.name}": unexpected product data from WooCommerce (type=${product.type}, purchasable=${product.is_purchasable}, in stock=${product.is_in_stock}); not tested`);
    }
  }
  // Only products WooCommerce explicitly says are purchasable AND in stock.
  const forSale = products.filter((product) => product.is_purchasable === true && product.is_in_stock === true && ["simple", "variable"].includes(product.type));
  if (forSale.length === 0) throw new StopEverything("WooCommerce lists products, but none are for sale, so nothing could be tested");
  for (const product of forSale) {
    product.testVariations = [];
    if (product.type !== "variable") continue;
    const records = await getAllPages(`${WOO}/wp-json/wc/store/v1/products?type=variation&parent=${product.id}`);
    const listed = Array.isArray(product.variations) ? product.variations : [];
    if (listed.length === 0) fail(`"${product.name}": has options but WooCommerce listed none`);

    // Every option record must be well formed. A malformed one is reported, never
    // quietly skipped, so coverage can't shrink without anyone noticing.
    const buyable = new Map();
    for (const record of records) {
      if (!Number.isInteger(record.id) || typeof record.is_in_stock !== "boolean" || typeof record.is_purchasable !== "boolean") {
        fail(`"${product.name}": WooCommerce returned a malformed option record (${JSON.stringify({ id: record.id, in_stock: record.is_in_stock, purchasable: record.is_purchasable })})`);
        continue;
      }
      buyable.set(record.id, record.is_in_stock && record.is_purchasable);
    }
    const listedIds = new Set(listed.map((variation) => variation.id));
    for (const record of records) {
      if (Number.isInteger(record.id) && !listedIds.has(record.id)) fail(`"${product.name}": WooCommerce returned option ${record.id}, which the product doesn't list`);
    }
    for (const variation of listed) {
      const options = variation.attributes;
      const wellFormed = Number.isInteger(variation.id) && Array.isArray(options) && options.length > 0 &&
        options.every((option) => typeof option?.name === "string" && option.name && typeof option?.value === "string" && option.value);
      if (!wellFormed) { fail(`"${product.name}": option ${variation.id} has missing or malformed choices (${JSON.stringify(options)})`); continue; }
      if (!buyable.has(variation.id)) { fail(`"${product.name}": option ${variation.id} is listed but WooCommerce returned no usable details for it`); continue; }
      // Tested only if WooCommerce explicitly says it is in stock AND purchasable.
      if (buyable.get(variation.id)) product.testVariations.push({ id: variation.id, options });
    }
  }
  return forSale;
}

// ---- 3: everything for sale is on /shop ------------------------------------
async function checkShopListing(browser, products) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${SITE}/shop`, { waitUntil: "networkidle" });
    const hrefs = new Set(await page.$$eval('a[href^="/shop/"]', (links) => links.map((link) => link.getAttribute("href"))));
    const missing = products.filter((product) => !hrefs.has(`/shop/${product.id}`));
    if (missing.length === 0) pass(`all ${products.length} products for sale appear on /shop`);
    for (const product of missing) fail(`"${product.name}" is for sale in WooCommerce but missing from /shop`);
  } finally {
    await context.close();
  }
}

// ---- 4: every option adds to the cart ---------------------------------------
async function readCart(page) {
  const cart = await page.evaluate(async (timeout) => {
    const response = await fetch("/api/shop/cart", { cache: "no-store", signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return { error: `cart returned HTTP ${response.status}` };
    try { return { body: await response.json() }; } catch { return { error: "cart did not return JSON" }; }
  }, REQUEST_TIMEOUT_MS);
  // A cart we can't read properly is never treated as "empty".
  if (cart.error) throw new Error(cart.error);
  if (!cart.body || !Array.isArray(cart.body.items)) throw new Error("cart response had no items list");
  return cart.body.items.map((item) => ({ id: item.id, quantity: item.quantity }));
}

async function emptyCartOrFail(page, label) {
  const ok = await page.evaluate(async (timeout) => {
    const response = await fetch("/api/shop/cart/clear", { method: "POST", signal: AbortSignal.timeout(timeout) });
    return response.ok;
  }, REQUEST_TIMEOUT_MS);
  const left = await readCart(page);
  if (!ok || left.length) { fail(`${label}: could not empty the test cart afterwards (${left.length} item(s) left)`); return false; }
  return true;
}

async function addAndConfirm(page, panel, label, expectedId) {
  // Before touching anything: a brand-new visitor's cart must be readable and empty.
  // If not, cart separation may be broken, so stop the whole run WITHOUT clearing it
  // (it might not be ours to clear).
  let before;
  try { before = await readCart(page); } catch (error) { throw new StopEverything(`${label}: couldn't read the new visitor's cart (${error.message}); stopped without changing anything`); }
  if (before.length) throw new StopEverything(`${label}: a brand-new visitor's cart already had ${before.length} item(s); stopped without changing anything`);

  // Cleanup only happens if an add-to-cart request was actually sent.
  let sentAddRequest = false;
  const watchRequests = (request) => { if (request.url().includes("/api/shop/cart/add-item")) sentAddRequest = true; };
  page.on("request", watchRequests);
  try {
    const button = panel.locator('button[aria-label^="Add "][aria-label$=" to cart"]').first();
    if (!(await button.count())) { fail(`${label}: no Add to Cart button after choosing the options`); return; }
    if (!(await button.isEnabled())) { fail(`${label}: Add to Cart button is disabled`); return; }

    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/shop/cart/add-item"), { timeout: 20_000 }).catch(() => null);
    await button.click();
    const response = await responsePromise;
    if (!response) { fail(`${label}: clicking Add to Cart did nothing (no request sent within 20 seconds)`); return; }
    if (response.status() < 200 || response.status() >= 300) {
      // Read the error message, but never wait more than 5 seconds for it.
      let message = "";
      try {
        const parsed = await Promise.race([response.json(), new Promise((resolve) => setTimeout(() => resolve({}), 5_000))]);
        message = parsed?.message || "";
      } catch { /* not JSON */ }
      fail(`${label}: cart rejected it (HTTP ${response.status()}) ${message}`.trim());
      return;
    }

    // Don't trust the "OK" alone: check the cart now holds exactly this item, once.
    // In the cart, item.id is the option's own id for variable products (e.g. 691,
    // "Prince of Peace - Complete") and the product id for simple products (e.g. 565).
    const after = await readCart(page);
    const match = after.filter((item) => item.id === expectedId);
    if (after.length === 1 && match.length === 1 && match[0].quantity === 1) { pass(`${label}: added to cart and confirmed in the cart`); coverage.options += 1; }
    else fail(`${label}: cart said OK but holds ${JSON.stringify(after)} instead of item ${expectedId} x1`);
  } finally {
    // Runs whenever an add request was sent, even if a later step failed, timed out or
    // crashed. It only ever empties this test visitor's own cart, checked empty above.
    page.off("request", watchRequests);
    if (sentAddRequest) await emptyCartOrFail(page, label).catch((error) => fail(`${label}: could not check the test cart was emptied: ${error.message}`));
  }
}

// One fresh visitor per test, so a problem in one test can't affect the next.
async function asFreshVisitor(browser, productId, label, run) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${SITE}/shop/${productId}`, { waitUntil: "networkidle" });
    const panel = page.locator("article:has(h1)").first();
    if (!(await panel.count())) { fail(`${label}: product page did not load`); return; }
    const overlay = await page.locator('[role="dialog"]:visible, [aria-modal="true"]:visible').count();
    if (overlay) fail(`${label}: a pop-up is covering the product page`);
    await run(page, panel);
  } catch (error) {
    if (error instanceof StopEverything) throw error;
    fail(`${label}: test crashed: ${error.message}`);
  } finally {
    await context.close();
  }
}

async function checkSizeOrder(page, panel, label) {
  const sizeGroup = panel.locator("fieldset", { has: page.locator("legend", { hasText: /size/i }) }).first();
  if (!(await sizeGroup.count())) return;
  const shown = (await sizeGroup.locator("button").allInnerTexts()).map(norm);
  const ranks = shown.map((size) => SIZE_ORDER.indexOf(size)).filter((rank) => rank >= 0);
  if (ranks.some((rank, index) => index > 0 && rank < ranks[index - 1])) fail(`${label}: sizes out of order (${shown.join(", ")})`);
}

async function checkProduct(browser, product) {
  const name = `"${product.name}"`;
  coverage.products += 1;

  if (product.type !== "variable") {
    await asFreshVisitor(browser, product.id, name, (page, panel) => addAndConfirm(page, panel, name, product.id));
    return;
  }

  if (product.testVariations.length === 0) {
    fail(`${name}: shows as in stock, but none of its options can be bought`);
    return;
  }

  let sizesChecked = false;
  for (const variation of product.testVariations) {
    const label = `${name} ${variation.options.map((option) => option.value).join(" / ")}`;
    await asFreshVisitor(browser, product.id, label, async (page, panel) => {
      if (!sizesChecked) { await checkSizeOrder(page, panel, name); sizesChecked = true; }
      for (const option of variation.options) {
        const group = panel.locator("fieldset", { has: page.locator("legend", { hasText: new RegExp(`^\\s*${option.name}\\s*$`, "i") }) }).first();
        if (!(await group.count())) { fail(`${label}: no "${option.name}" choice shown on the page`); return; }
        const buttons = group.locator("button");
        const index = (await buttons.allInnerTexts()).map(norm).indexOf(norm(option.value));
        if (index < 0) { fail(`${label}: option "${option.value}" not shown on the page`); return; }
        const button = buttons.nth(index);
        if (!(await button.isEnabled())) { fail(`${label}: option "${option.value}" is greyed out but WooCommerce has stock`); return; }
        await button.click();
      }
      await addAndConfirm(page, panel, label, variation.id);
    });
  }
}

// ---- Run ---------------------------------------------------------------------
const browser = await chromium.launch();
try {
  await checkStatus();
  const products = await loadCatalog();
  await checkShopListing(browser, products);
  for (const product of products) await checkProduct(browser, product);
  await checkVersionUnchanged();
} catch (error) {
  fail(error instanceof StopEverything ? `STOPPED: ${error.message}` : `secret shopper could not run: ${error.message}`);
} finally {
  await browser.close();
}

console.log(`\n${passes.length} checks passed, ${problems.length} problems. Tested ${coverage.products} products and ${coverage.options} add-to-cart options.`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [`## Secret shopper: ${problems.length ? `❌ ${problems.length} problem(s)` : "✅ all good"}`, "", `Site tested: ${SITE}`, `Version: ${EXPECT_COMMIT ? EXPECT_COMMIT.slice(0, 7) : "not checked"}`, `Coverage: ${coverage.products} products, ${coverage.options} options added to cart.`, `${passes.length} checks passed.`, ""];
  if (problems.length) lines.push("### Problems", ...problems.map((problem) => `- ${problem}`));
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
}
if (problems.length) {
  console.log("\nPROBLEMS:\n" + problems.map((problem) => `- ${problem}`).join("\n"));
  process.exit(1);
}
