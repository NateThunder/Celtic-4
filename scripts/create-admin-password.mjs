import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (existsSync(".dev.vars")) throw new Error(".dev.vars already exists; keep the existing admin password.");
const password = randomBytes(24).toString("base64url");
mkdirSync("output/cloudflare", { recursive: true });
writeFileSync(".dev.vars", `ADMIN_PASSWORD=${password}\n`);
writeFileSync("output/cloudflare/admin-credentials.txt", `Username: admin\nPassword: ${password}\n`);
console.log("Admin credentials saved to output/cloudflare/admin-credentials.txt (ignored by Git).");
