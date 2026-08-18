import { EB_Garamond } from "next/font/google";

/**
 * The editorial body serif for /about. Loaded through the same next/font
 * loader the root layout uses, but scoped to this route so no other page's
 * markup changes. Display type reuses the site-wide `--font-anton`.
 */
export const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400"],
  display: "swap",
});
