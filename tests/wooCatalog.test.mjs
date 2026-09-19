import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const fixture = JSON.parse(await readFile(new URL("../data/woo-products.json", import.meta.url), "utf8"));
const source = (await readFile(new URL("../app/lib/wooCatalog.ts", import.meta.url), "utf8"))
  .replace('import fixture from "../../data/woo-products.json";', `const fixture = ${JSON.stringify(fixture)};`)
  .replace('import { readProductCatalog } from "#product-catalog";', "const readProductCatalog = async () => fixture;");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { fetchCatalogArray } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("Store API variation query returns the parent's variants with stock preserved", async () => {
  const result = await fetchCatalogArray(new URL("https://example.com/wp-json/wc/store/v1/products?type=variation&parent=1882&per_page=100"), []);
  assert.deepEqual(result, fixture.variations["1882"]);
  assert.equal(result.find((item) => item.id === 1888).is_in_stock, true);
  assert.equal(result.find((item) => item.id === 1887).is_in_stock, false);
});

test("unknown parent does not return unrelated products", async () => {
  assert.deepEqual(await fetchCatalogArray(new URL("https://example.com/wp-json/wc/store/v1/products?type=variation&parent=999999"), []), []);
});

test("normal product queries still return the product catalogue", async () => {
  assert.deepEqual(await fetchCatalogArray(new URL("https://example.com/wp-json/wc/store/v1/products"), []), fixture.products);
});
