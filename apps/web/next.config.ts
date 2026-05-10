import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Standalone : Next emet un server.js minimal + node_modules nécessaires
  // → permet un Docker très léger (~200 MB au lieu de ~1 GB).
  output: "standalone",
  outputFileTracingRoot: process.cwd().endsWith("apps/web")
    ? `${process.cwd()}/../..`
    : undefined,
  transpilePackages: ["@soufi/content", "@soufi/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "icjvjabyhhugkxauytxh.supabase.co" },
      { protocol: "https", hostname: "eeqwxxstrmnqurmtbhfj.supabase.co" },
      { protocol: "https", hostname: "cdn.iavance.fr" },
    ],
  },
  experimental: {
    typedRoutes: false,
  },
};

export default config;
