This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Shop card payments

The shop checkout uses the enabled WooCommerce gateways: FunnelKit Stripe (`fkwcs_stripe`) and PayPal. Configure the public browser key from the **same Stripe account and test/live mode** as FunnelKit in `.env.local` (and in hosting environment variables when deploying):

```bash
SHOP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Card details are collected directly by Stripe Elements on `/shop/checkout`. Only a PaymentMethod ID is sent through the site to WooCommerce. WooCommerce calculates and charges the order, and its gateway handles fulfillment and webhooks. Bank authentication runs on the checkout page before continuing to WooCommerce's order verification/receipt page. The shop does not use `STRIPE_SECRET_KEY`.

Use a matching WooCommerce test environment and test key to exercise successful payments, declines, and 3-D Secure before live transactions. Run `node --experimental-strip-types --test tests/shopPayments.test.mjs` for payment response checks.

Apple Pay and Google Pay use Stripe's Express Checkout Element through the same WooCommerce card gateway. Customers complete their billing/delivery fields, then prepare the wallet payment so WooCommerce calculates the total including shipping and tax. The server checks that total again before charging; changed totals require another review. Only wallets supported by the customer's browser/account are shown.

Wallets require **HTTPS**, including during development, and the checkout hostname must be registered in the same Stripe account under **Settings → Payment method domains**, in the matching test/live mode. Plain `http://localhost:3000` displays the wallet availability message; it cannot launch these wallets. Test on a registered HTTPS development or staging domain with a supported browser and configured Apple Wallet/Google Pay account. A successful wallet payment has not been verified against the live account.

## Stem Checkout

Stem purchases use Stripe Checkout directly, separately from the WooCommerce shop. Add these environment variables before testing paid stem checkout:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

In production, set `NEXT_PUBLIC_SITE_URL` to the live site origin so Stripe returns customers to the right success and cancel pages.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
