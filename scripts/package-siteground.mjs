import { access, cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, ".siteground");
const standalone = path.join(root, ".next", "standalone");
await access(path.join(standalone, "server.js"));
await access(path.join(root, ".next", "static"));
// Deliberately refuse reuse: a previous package may now contain live user data.
await mkdir(destination);
await cp(standalone, destination, {
  recursive: true,
  filter(source) {
    const parts = path.relative(standalone, source).split(path.sep);
    return !parts.some(part => part.startsWith(".env") || part.startsWith(".dev.vars"))
      && !(parts[0] === ".next" && ["cache", "dev"].includes(parts[1]));
  },
});
await cp(path.join(root, "public"), path.join(destination, "public"), { recursive: true });
await cp(path.join(root, ".next", "static"), path.join(destination, ".next", "static"), { recursive: true });
// Seed data only. Before activation, attach the existing production data/uploads.
await cp(path.join(root, "data"), path.join(destination, "data"), { recursive: true });
let files = 0;
let directories = 1;
async function count(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) { directories++; await count(path.join(directory, entry.name)); }
    else files++;
  }
}
await count(destination);
console.log(`SiteGround package: ${files} files, ${directories} directories (${files + directories} entries).`);
console.log("Deploy only .siteground contents. Preserve production data/uploads and supply production environment variables before starting node server.js.");
