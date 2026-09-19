import test from "node:test";
import assert from "node:assert/strict";
import { isHoneypotSubmission, parseCommunitySignup } from "../app/lib/communitySignup.ts";

test("normalizes a valid community signup", () => {
  assert.deepEqual(parseCommunitySignup({
    firstName: "  Màiri  ",
    lastName: "  MacKay ",
    email: " PERSON@Example.com ",
    consent: true,
  }), {
    firstName: "Màiri",
    lastName: "MacKay",
    email: "person@example.com",
  });
});

test("requires names, a valid email, and explicit consent", () => {
  const valid = { firstName: "Màiri", lastName: "MacKay", email: "person@example.com", consent: true };
  assert.equal(parseCommunitySignup({ ...valid, firstName: "" }), null);
  assert.equal(parseCommunitySignup({ ...valid, email: "not-an-email" }), null);
  assert.equal(parseCommunitySignup({ ...valid, consent: false }), null);
  assert.equal(parseCommunitySignup({ ...valid, firstName: "A".repeat(61) }), null);
});

test("detects the hidden bot field", () => {
  assert.equal(isHoneypotSubmission({ website: "https://spam.example" }), true);
  assert.equal(isHoneypotSubmission({ website: "" }), false);
});
