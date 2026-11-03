import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security-policy";

const nextConfig: NextConfig = {
  // Keep Fast Refresh output separate from the build used by the local preview.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "api.erlc.gg", pathname: "/maps/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.discordapp.com", pathname: "/**" },
      { protocol: "https", hostname: "media.discordapp.net", pathname: "/**" },
      { protocol: "https", hostname: "*.rbxcdn.com", pathname: "/**" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  poweredByHeader: false,
  outputFileTracingIncludes: { "/*": ["./data/rules.fixture.json"] },
  // Keep reusable build headers independent of a temporary tunnel hostname.
  // Middleware adds the origin-specific HTTPS policy at request time.
  async headers() { return [{ source: "/:path*", headers: securityHeaders({ ...process.env, SITE_URL: "http://localhost:3000" }) }]; },
};

export default nextConfig;
