# Cloudflare Worker preview

The Worker is named `celtic-worship`. Products load from Cloudflare KV, and the browser stores its cart in localStorage. Cart and checkout API proxies remain disabled (`CHECKOUT_DISABLED=true`); the storefront cart is enabled (`NEXT_PUBLIC_COMMERCE_DISABLED=false`). Stem checkout remains disabled under that existing flag.

Checkout uses a top-level browser POST to `https://cms.celticworship.co.uk/?wc-api=cw_cart_handoff`. It does not fetch the CMS from a Worker or use cross-origin AJAX. The CMS validates every item and calculates prices using WooCommerce, replaces its cart, sets its session cookie, and redirects to its checkout. Unsupported product types or invalid carts fail without partially replacing the previous cart. Browser subtotals are estimates; the browser cart stays saved after handoff (including after purchase) until the customer clears it.

Before deploying the storefront, install and activate `wordpress/celtic-worship-cart-handoff.php` on the CMS (or copy it into `wp-content/mu-plugins/`). An installable ZIP is at `output/celtic-worship-cart-handoff.zip`. The default allowed browser origins are `https://celticworship.co.uk` and `https://www.celticworship.co.uk`. Additional staging origins must be explicitly added through the `cw_cart_handoff_origins` WordPress filter. Do not allow arbitrary origins. Exclude `?wc-api=cw_cart_handoff` from page caching. No handoff secret belongs in the browser.

Validate on staging: simple items; variations; sold-out and insufficient stock; sold-individually limits; repeat handoff without duplicate quantities; rejection from an unapproved origin; then Stripe test-mode and PayPal sandbox checkout. Install the CMS plugin before enabling the updated storefront. No live payment has been verified by these code changes.

The storefront reads `catalog:index` from `PRODUCT_CATALOG`. The local JSON fixture remains a development/emergency fallback.

The CMS MU plugin is [wordpress/celtic-worship-product-sync.php](wordpress/celtic-worship-product-sync.php). It uses WooCommerce's internal Store API and pushes full or incremental changes to `POST /api/internal/product-sync`. Requests are signed with HMAC-SHA256 over `<timestamp>.<raw-body>`. The Worker allows a five-minute clock window and records event IDs in D1 to reject replays atomically. Failed CMS deliveries remain queued and retry with exponential backoff; KV publishes the catalogue index last so a partial write cannot replace the last valid snapshot.

The CMS page **Tools → Product Sync** shows configuration and retry-queue status and provides the secured full-sync action. Product saves, restores, deletes, price changes, and stock hooks queue incremental syncs automatically. `PRODUCT_SYNC_SECRET` is a Cloudflare secret and the matching CMS value is stored server-side; it must never be added to frontend variables or committed files.

```sh
npm install
npm run typecheck:worker
npm run build:worker
npx wrangler deploy --config dist/server/wrangler.json --dry-run
npm run deploy
```

FFmpeg must be on PATH for the first Worker build. The build creates a 720p homepage video in `output/cloudflare/hero.mp4`, keeps the original source video, and excludes the unused `Sequence 01_1.mp4` from deployment. Delete only the generated `hero.mp4` when you change the source and want to regenerate it.

Stem metadata uses D1 (`celtic-worship-stems`), and audio files use a private R2 bucket of the same name. The Worker serves audio through `/api/stems/audio/...` with byte-range support and maps the migrated file URLs automatically. Next.js local development continues to use `data/stem-tracks.json` and `public/stems/uploads`.

One-time storage setup and migration (R2 must first be enabled on the account):

```sh
npx wrangler r2 bucket create celtic-worship-stems
npx wrangler d1 migrations apply celtic-worship-stems --remote
node scripts/migrate-stems.mjs --remote
```

The migration preserves session IDs and inserts metadata only if absent, so re-running it does not overwrite cloud metadata edits. It uploads local audio files at their existing keys.

Admin uses username `admin` and a generated password. Run `node scripts/create-admin-password.mjs` once to save it in the ignored `.dev.vars` and `output/cloudflare/admin-credentials.txt`. Upload it with the first deployment:

```sh
npx wrangler deploy --config dist/server/wrangler.json --secrets-file .dev.vars
```

Later deployments retain that secret. Never commit `.dev.vars` or the credential file. Hosted stem uploads are limited to 32 MB per request; append additional stems through the edit form. Mutating admin requests require a matching Origin header.

For local Worker checks, apply the D1 migration with `--local`, run `node scripts/migrate-stems.mjs`, then `npm run start:vinext`. Run `node scripts/check-worker.mjs http://localhost:8787` to check pages, blocked checkout, admin authentication, and migrated audio. Pass the deployed workers.dev origin to check the remote deployment.

The public `/stem-player` page currently returns 404 by design in the existing app; saved sessions are available through the protected stem admin. Google fonts are CDN-loaded under vinext, and images are served without Next.js image optimization.
