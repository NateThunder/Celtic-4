import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono, Montserrat } from "next/font/google";
import Script from "next/script";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScrollProvider from "./components/SmoothScrollProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Celtic Worship | Songs for the Church",
  description:
    "Celtic Worship is a Christ-centred worship collective writing and leading songs through the sounds of Scotland.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${anton.variable} antialiased`}
      >
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
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
