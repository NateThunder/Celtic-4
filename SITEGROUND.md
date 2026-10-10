# SiteGround runtime packaging and inode audit

Production remains SiteGround, deployed through GitHub. Nothing in this change
pushes or deploys. Do not use `npm run deploy`: it targets the Cloudflare preview.

## Findings (local checkout, before build)

| Directory | Files | Subdirectories |
| --- | ---: | ---: |
| node_modules | 28,998 | 3,045 |
| .next | 27,636 | 595 |
| .git | 4,492 | 349 |
| dist | 432 | 39 |
| .playwright-cli | 191 | 0 |
| public | 138 | 17 |
| output | 92 | 4 |

`.next/dev` accounts for 26,727 files; `.next/cache` only 34. Running `next dev`
on production, uploading a developer checkout, or retaining a build workspace
could therefore dwarf ordinary cache usage. These are local observations, not
measurements of the hosting account. There is no `.github` workflow or SiteGround
deployment configuration here to prove which files are copied or retained.
The owner reports that GitHub replaces deployments; hidden-file cleanup and
release/cache retention still need verification in that external workflow.

Cloudflare tooling is installed alongside Next.js and contributes to the full
dependency tree. Standalone tracing excludes unused build tools without removing
the preview's dependencies. `dist`, `.vinext`, and `.wrangler` are not Node production
runtime artifacts. Never discard a `.wrangler` directory if it contains needed local data.

`public/image.png` and `public/textures/hero-title-texture.png` have identical
contents. Both are preserved: removing one saves just one file and may break a URL.
No evidence of application log rotation or temporary-upload directories was found.
The stem upload directory is permanent user content, not temporary storage.

## Build and start

Use a fresh GitHub CI workspace on Linux matching SiteGround's CPU/libc and a
compatible Node version. Do not deploy a Windows-built package with native modules.

Build command: `npm ci && npm run build:siteground`

Publish **only the contents of `.siteground/`**, including its hidden `.next`
directory, as the runtime root. Start command from that root: `node server.js`.
Set `NODE_ENV=production`, `HOSTNAME=0.0.0.0` and the hosting-assigned `PORT`.
Supply existing production secrets/environment via hosting configuration.
Public build-time environment values must also be present during the build.
No `npm install` is needed inside the published artifact.

If testing from the repository, `npm run start:siteground` starts the package.
The existing `npm start` remains `next start`; it is not the standalone start command.

Packaging copies traced standalone dependencies, `.next/static`, all public assets,
and data. It excludes `.next/cache`, `.next/dev` and local environment files.
It refuses an existing `.siteground` directory, avoiding accidental overwrites of
runtime uploads. Use a fresh CI workspace for every release; do not accumulate
build workspaces or timestamped packages on the hosting account.

Enabling standalone alone does not save hosting inodes if the deployment still
copies the repository, full node_modules, or the entire .next directory alongside it.
If SiteGround builds in place, retaining that workspace defeats most of the saving.
Configure the GitHub deployment to transfer only the artifact, then retire its
build workspace after successful activation. Confirm this is supported before switching.

## Preserve state before replacing a release

`data/stem-tracks.json` is read AND written at runtime. `public/stems/uploads`
contains permanent audio. Before activation, attach the authoritative production
copies to the new runtime (persistent shared storage/symlinks or a controlled copy
while uploads are paused). Never overwrite them with repository seed copies.
Keep the rest of `data`, including `woo-products.json`, and all required public assets.
Back up production state outside the release first. Existing environment files,
WordPress uploads, databases and CMS/plugin installations are out of cleanup scope.

The server changes its working directory to its runtime root. State must be under
that root at the same relative paths. Keep runtime .next writable: fetch/ISR caches
can be recreated. Shipping a prepopulated `.next/cache` is unnecessary; disabling
runtime caching would change behavior and is not part of this change. Image
optimization was already disabled, so normal Next image-cache growth is avoided.

## Proposed cleanup on the existing host (not executed)

First identify the actual Node release directory. Do not apply these names across
the hosting account or WordPress tree. Stop the old process before cache cleanup.

- `.next/dev`: development output, removable when no development server uses it.
- `.next/cache`: disposable Next cache; removal gives a cold cache and may trigger
  upstream requests. It can be recreated. Do not remove `.next/server` or `.next/static`.
- Verified build/tool caches: `.cache`, `.turbo`, `.npm`, `.pnpm-store`, and
  build-only `.yarn/cache`, when no install/build is active and offline installs
  do not rely on them. Account-wide caches require a separate inventory.
- `.playwright-cli`, `playwright-report`, `test-results`, coverage and confirmed
  local screenshots/debug logs: unnecessary in the Node runtime. Retain any logs
  required for diagnosis; rotate active server logs instead of deleting open files.
- `.next_backup_*`, old releases, old archives and build workspaces: only after
  confirming they contain no unique state and the replacement release passes checks.
- Full repository `node_modules`, `.git`, source/build tooling and Cloudflare `dist`
  can be omitted from the NEW artifact. Retire their OLD release only after cutover.
  Never remove the standalone artifact's own `node_modules`.
- Temporary files only after individually confirming their purpose; no blanket
  deletion of upload directories, `data`, public assets, or hosting-managed files.

Use a fresh release for this migration, not an overlay. Preserve state and secrets,
validate pages/assets, admin audio reads/uploads, cart/checkout and mailing signup,
then switch traffic and retire the old release. Limit rollback retention; don't
retain unlimited full copies. Verify the live response through the SiteGround
deployment workflow before considering a future production deployment complete.

`.gitignore` does not untrack historical files: 81 `.playwright-cli` files and
many output screenshots/logs/archives are already tracked, as are some uploaded
audio files. They were not removed in this audit. The artifact allowlist excludes
reports regardless of Git tracking. Separately review untracking reports while
preserving local files; never bulk-untrack public assets or production data.

Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
documents standalone tracing and the required public/static asset copies.

## Local validation

`npm run build:siteground` passed using Next.js 16.1.6, including TypeScript and
37 generated pages. Network access was required for the existing Google Fonts.
The resulting Windows validation package contained 2,111 files and 437 directories
(2,548 entries), including 1,270 dependency files. Compared with the original
60,276 entries in node_modules plus .next, that is about 95.8% fewer entries,
despite also including public assets and data. Linux output and actual hosting
savings will differ. This does not measure account-wide WordPress/backups/mail.

The standalone server started with no `.next/cache` and no packaged `.env` files.
HTTP checks passed for `/`, `/about`, `/shop`, a generated static asset,
`/api/admin/stems`, and an existing audio download. `/stem-player` returned the
expected 404: its source explicitly calls `notFound()`. Payments, live signup,
authenticated production access and upload mutations were not exercised.
