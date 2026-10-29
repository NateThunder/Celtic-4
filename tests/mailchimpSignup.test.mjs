import test from "node:test";
import assert from "node:assert/strict";
import {
  getMailchimpConfig,
  mailchimpApiBase,
  subscribeToMailchimp,
  subscriberHash,
} from "../app/lib/mailchimpSignup.ts";

const signup = { firstName: "Màiri", lastName: "MacKay", email: "person@example.com" };
const config = { apiKey: "abc123-us5", audienceId: "522581d030" };

function fakeFetch(responses) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, method: init.method, body: JSON.parse(init.body), auth: init.headers.Authorization });
    const next = responses.shift() ?? { status: 200, body: "{}" };
    return new Response(next.body, { status: next.status });
  };
  return { fetcher, calls };
}

test("only turns on when an API key is set", () => {
  assert.equal(getMailchimpConfig({}), null);
  assert.deepEqual(getMailchimpConfig({ MAILCHIMP_API_KEY: " abc-us5 " }), { apiKey: "abc-us5", audienceId: "522581d030" });
  assert.equal(getMailchimpConfig({ MAILCHIMP_API_KEY: "abc-us5", MAILCHIMP_AUDIENCE_ID: "other" }).audienceId, "other");
});

test("reads the data centre from the key", () => {
  assert.equal(mailchimpApiBase("abc123-us5"), "https://us5.api.mailchimp.com/3.0");
  assert.throws(() => mailchimpApiBase("abc123"));
});

test("hashes the lower-cased email like Mailchimp", () => {
  assert.equal(subscriberHash(" Person@Example.com "), "7de8517bce4457e8390aa4006a1880fb");
});

test("adds new people as subscribed, never re-subscribes, and tags the source", async () => {
  const { fetcher, calls } = fakeFetch([]);
  await subscribeToMailchimp(signup, config, fetcher);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, "PUT");
  assert.equal(calls[0].url, `https://us5.api.mailchimp.com/3.0/lists/522581d030/members/${subscriberHash(signup.email)}`);
  assert.deepEqual(calls[0].body, {
    email_address: "person@example.com",
    status_if_new: "subscribed",
    merge_fields: { FNAME: "Màiri", LNAME: "MacKay" },
  });
  assert.equal("status" in calls[0].body, false);
  assert.ok(calls[0].auth.startsWith("Basic "));
  assert.deepEqual(calls[1].body, { tags: [{ name: "Website signup", status: "active" }] });
});

test("retries without names if the merge fields don't match", async () => {
  const { fetcher, calls } = fakeFetch([{ status: 400, body: '{"detail":"Your merge fields were invalid."}' }]);
  await subscribeToMailchimp(signup, config, fetcher);
  assert.equal(calls[1].method, "PUT");
  assert.equal("merge_fields" in calls[1].body, false);
});

test("fails loudly on other errors", async () => {
  const { fetcher } = fakeFetch([{ status: 401, body: "{}" }]);
  await assert.rejects(subscribeToMailchimp(signup, config, fetcher), /401/);
});
