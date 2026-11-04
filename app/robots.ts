import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/shop/cart", "/shop/checkout", "/stem-player"] }],
    sitemap: "https://celticworship.co.uk/sitemap.xml",
  };
}
