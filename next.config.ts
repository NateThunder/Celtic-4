import type { NextConfig } from "next";

const wooUrl = process.env.NEXT_PUBLIC_WOO_URL || "http://localhost:10003";

let wooRemotePattern:
  | {
      protocol: "http" | "https";
      hostname: string;
      port?: string;
      pathname: string;
    }
  | null = null;
let allowLocalWooIp = false;

try {
  const parsed = new URL(wooUrl);
  allowLocalWooIp = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  wooRemotePattern = {
    protocol: parsed.protocol.replace(":", "") as "http" | "https",
    hostname: parsed.hostname,
    port: parsed.port || undefined,
    pathname: "/**",
  };
} catch {
  wooRemotePattern = null;
}

const nextConfig: NextConfig = {
  images: {
    // Required for local WooCommerce hosts (localhost/127.0.0.1) in development.
    dangerouslyAllowLocalIP: allowLocalWooIp,
    remotePatterns: [
      ...(wooRemotePattern ? [wooRemotePattern] : []),
      {
        protocol: "http",
        hostname: "localhost",
        port: "10003",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "10003",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
