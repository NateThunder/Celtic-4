import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScrollProvider from "./components/SmoothScrollProvider";
import SiteFooter from "./components/SiteFooter";
import AnnouncementModal from "./components/AnnouncementModal";

// Fonts are stored in app/fonts instead of being downloaded from Google during each
// build, so a slow connection to Google can no longer stall the SiteGround build.
const geistSans = localFont({
  src: "./fonts/geist-latin-wght-normal.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-wght-normal.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const montserrat = localFont({
  src: "./fonts/montserrat-latin-wght-normal.woff2",
  variable: "--font-montserrat",
  weight: "100 900",
});

const anton = localFont({
  src: "./fonts/anton-latin-400-normal.woff2",
  variable: "--font-anton",
  weight: "400",
});

const bebasNeue = localFont({
  src: "./fonts/bebas-neue-latin-400-normal.woff2",
  variable: "--font-bebas-neue",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://celticworship.co.uk"),
  title: "Celtic Worship | Songs for the Church",
  description:
    "Celtic Worship is a Christ-centred worship collective writing and leading songs through the sounds of Scotland. New album Come Behold (Deluxe Edition) out now.",
  openGraph: {
    title: "Celtic Worship | Come Behold (Deluxe Edition) out now",
    description:
      "Christ-centred worship through the sounds of Scotland. Listen to Come Behold (Deluxe Edition) and join us at O Holy Night, O2 Academy Glasgow, 17 December.",
    url: "https://celticworship.co.uk",
    siteName: "Celtic Worship",
    images: [{ url: "/announcements/come-behold-deluxe.jpg", width: 1600, height: 1600, alt: "Come Behold Deluxe Edition album artwork" }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        id="top"
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${anton.variable} ${bebasNeue.variable} antialiased`}
      >
        <SmoothScrollProvider>
          {children}
          <SiteFooter />
        </SmoothScrollProvider>
        <AnnouncementModal />
        <Script
          src="https://widgetv3.bandsintown.com/main.min.js"
          strategy="afterInteractive"
          charSet="utf-8"
        />
        <Script src="/scripts/bandsintown-events.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
