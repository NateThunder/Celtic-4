import assert from "node:assert/strict";
import test from "node:test";

import { isSameOriginRequest } from "../app/lib/requestOrigin.ts";

test("accepts requests when origin matches the direct request URL", () => {
  const request = new Request("https://celticworship.co.uk/api/community", {
    headers: { origin: "https://celticworship.co.uk" },
  });

  assert.equal(isSameOriginRequest(request), true);
});

test("accepts requests using the public host supplied by a reverse proxy", () => {
  const request = new Request("http://127.0.0.1:3000/api/community", {
    headers: {
      host: "127.0.0.1:3000",
      origin: "https://celticworship.co.uk",
      "x-forwarded-host": "celticworship.co.uk",
      "x-forwarded-proto": "https",
    },
  });

  assert.equal(isSameOriginRequest(request), true);
});

test("rejects a different origin through a reverse proxy", () => {
  const request = new Request("http://127.0.0.1:3000/api/community", {
    headers: {
      origin: "https://attacker.example",
      "x-forwarded-host": "celticworship.co.uk",
      "x-forwarded-proto": "https",
    },
  });

  assert.equal(isSameOriginRequest(request), false);
});

test("accepts server-to-server requests without an origin header", () => {
  assert.equal(isSameOriginRequest(new Request("https://celticworship.co.uk/api/community")), true);
});
