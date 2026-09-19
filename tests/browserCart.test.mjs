import { test } from "node:test";
import assert from "node:assert/strict";
import { addLocalItem, parseStoredCart, cartSubtotal, handoffItems } from "../app/lib/browserCart.ts";
const item = { id: 12, name: "Album", price: "\u00a312.50", href: "/shop/12", unitAmount: 12.5, currency: "GBP" };
test("cart survives persistence, combines quantities, and calculates estimated subtotal", () => {
 const cart = addLocalItem(addLocalItem([], item), item);
 assert.equal(cart[0].quantity, 2);
 assert.deepEqual(parseStoredCart(JSON.stringify(cart)), cart);
 assert.equal(cartSubtotal(cart), "\u00a325.00");
});
test("variants remain separate and attribute ordering is stable", () => {
 const a = { ...item, variation: [{attribute:"size",value:"s"},{attribute:"colour",value:"blue"}] };
 const cart = addLocalItem(addLocalItem([], a), {...a, variation:[...a.variation].reverse()});
 assert.equal(cart.length,1); assert.equal(cart[0].quantity,2);
 assert.equal(addLocalItem(cart,{...item,variation:[{attribute:"size",value:"m"}]}).length,2);
});
test("handoff omits all display prices and metadata", () => {
 assert.deepEqual(handoffItems(addLocalItem([], item)), [{id:12, quantity:1, variation:[]}]);
});
test("corrupt storage and invalid quantities are rejected", () => {
 assert.deepEqual(parseStoredCart("broken"), []);
 assert.deepEqual(parseStoredCart(JSON.stringify([{...item,key:"x",quantity:-1}])), []);
 assert.throws(()=>addLocalItem([],{...item,quantity:100}));
 assert.throws(()=>addLocalItem([],{...item,id:0}));
 assert.equal(cartSubtotal([{...item,key:"x",quantity:1,unitAmount:undefined}]), "Confirmed at checkout");
});
