import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// This check deliberately writes only to the local Worker, never a remote URL.
const origin = "http://127.0.0.1:8787";
const password = (await readFile(".dev.vars", "utf8")).match(/^ADMIN_PASSWORD=(.+)$/m)[1];
const headers = { authorization: `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`, origin };
const form = new FormData();
form.set("title", "Local storage verification");
form.append("stemNames", "Test audio");
form.append("stems", new Blob([new Uint8Array([73, 68, 51, 0])], { type: "audio/mpeg" }), "test.mp3");
const created = await fetch(`${origin}/api/admin/stems`, { method: "POST", headers, body: form });
assert.equal(created.status, 201, await created.clone().text());
const { track } = await created.json();
const audio = await fetch(origin + track.stems[0].fileUrl);
assert.equal(audio.status, 200);
assert.deepEqual([...new Uint8Array(await audio.arrayBuffer())], [73, 68, 51, 0]);
const update = new FormData();
update.set("trackId", track.id);
update.set("title", "Local storage verification updated");
update.append("existingStemIds", track.stems[0].id);
update.append("existingStemNames", "Renamed audio");
const edited = await fetch(`${origin}/api/admin/stems`, { method: "PUT", headers, body: update });
assert.equal(edited.status, 200, await edited.clone().text());
const result = await edited.json();
assert.equal(result.track.title, "Local storage verification updated");
assert.equal(result.track.stems[0].name, "Renamed audio");
console.log("Local upload, R2 download, and D1 metadata edit passed.");
