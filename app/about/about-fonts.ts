import localFont from "next/font/local";

/**
 * The editorial body serif for /about, scoped to this route so no other page's
 * markup changes. Display type reuses the site-wide `--font-anton`. The files live
 * in app/fonts so the build never has to download them.
 */
export const ebGaramond = localFont({
  src: [
    { path: "../fonts/eb-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/eb-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-eb-garamond",
  display: "swap",
});
