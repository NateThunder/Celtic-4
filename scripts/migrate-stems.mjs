import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const remote = process.argv.includes("--remote");
const location = remote ? "--remote" : "--local";
const cli = path.resolve("node_modules/wrangler/bin/wrangler.js");
function wrangler(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: "inherit" });
  if (result.status !== 0) throw new Error("Stem migration stopped; see Wrangler error above.");
}
const tracks = JSON.parse(await readFile("data/stem-tracks.json", "utf8"));
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const sql = [];
for (const track of tracks) {
  for (const stem of track.stems) {
    const key = stem.fileUrl.replace(/^\//, "");
    if (!/^stems\/uploads\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(key) || key.includes("..")) throw new Error("Invalid stem path");
    wrangler(["r2", "object", "put", `celtic-worship-stems/${key}`, "--file", path.join("public", key), "--content-type", key.endsWith(".mp3") ? "audio/mpeg" : "application/octet-stream", location]);
  }
  // Never overwrite edits already saved in the cloud.
  sql.push(`INSERT OR IGNORE INTO stem_tracks (id, created_at, payload) VALUES (${quote(track.id)}, ${quote(track.createdAt)}, ${quote(JSON.stringify(track))});`);
}
await mkdir("output/cloudflare", { recursive: true });
await writeFile("output/cloudflare/seed-stems.sql", sql.join("\n"));
wrangler(["d1", "execute", "celtic-worship-stems", "--file", "output/cloudflare/seed-stems.sql", location]);
console.log(`Migrated ${tracks.length} stem sessions ${remote ? "to Cloudflare" : "locally"}.`);
