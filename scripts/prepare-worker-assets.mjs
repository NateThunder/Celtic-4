import { copyFile, readdir, stat, unlink, rm } from "node:fs/promises";
import path from "node:path";

// Preserve source media; only replace the oversized video in generated output.
const root = path.resolve("dist/client");
const stems = path.resolve(root, "stems/uploads");
if (!stems.startsWith(root + path.sep)) throw new Error("Invalid generated asset path");
// All hosted stems are served from R2, including the migrated files.
await rm(stems, { recursive: true, force: true });
await copyFile("output/cloudflare/hero.mp4", path.join(root, "Your Kindness (Official Music Video) - 1m58s compressed.mp4"));
// This unused source video is not referenced by the app.
await unlink(path.join(root, "Sequence 01_1.mp4")).catch(error => {
  if (error.code !== "ENOENT") throw error;
});
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await check(file);
    else if ((await stat(file)).size > 25 * 1024 * 1024) {
      throw new Error(`Worker asset exceeds 25 MiB: ${file}`);
    }
  }
}
await check(root);
console.log("Worker assets fit the upload limit.");
