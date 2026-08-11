import type { Metadata } from "next";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import AboutBody from "./about-body";
import { ABOUT_PHOTOS, MEMBERS } from "./about-data";
import { ebGaramond } from "./about-fonts";
import AboutHero from "./about-hero";
import styles from "./about.module.css";

const SITE_URL = "https://www.celticworship.co.uk";
const TITLE = "About | Celtic Worship";
const DESCRIPTION =
  "Seven Scottish players, one sound. How Celtic Worship began in 2016, the four albums since, and the making of Harvest at a family farm in Morayshire.";
const OG_IMAGE = `${ABOUT_PHOTOS}/scenes/cowfords-barn.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    type: "profile",
    url: "/about",
    siteName: "Celtic Worship",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1100,
        height: 733,
        alt: "The barn at Cowfords Farm, Morayshire",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const musicGroupJsonLd = {
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  name: "Celtic Worship",
  url: `${SITE_URL}/about`,
  image: `${SITE_URL}${OG_IMAGE}`,
  description: DESCRIPTION,
  foundingDate: "2016",
  foundingLocation: {
    "@type": "Place",
    name: "Scotland",
  },
  genre: ["Celtic", "Worship", "Contemporary Christian"],
  member: MEMBERS.map((person) => ({
    "@type": "Person",
    name: person.name,
    roleName: person.instrument,
  })),
  sameAs: [
    "https://open.spotify.com/artist/0h2AQKpVBEEXQQ03KGf7ep",
    "https://www.youtube.com/CelticWorshipMusic",
    "https://www.instagram.com/celtic_worship",
  ],
};

export default function AboutPage() {
  return (
    <div className={`site-shell ${ebGaramond.variable}`}>
      {/* Overlay variant so the nav sits transparent over the collage and the
          strips run full-bleed to the top, as in the reference. It goes opaque
          on scroll. Scoped to this page — every other route keeps the default. */}
      <SiteHeader variant="home" />
      <script
        type="application/ld+json"
        // Static, author-controlled object — no user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicGroupJsonLd) }}
      />
      <main className={styles.page}>
        <AboutHero />
        <AboutBody footer={<SiteFooter />} />
      </main>
    </div>
  );
}
