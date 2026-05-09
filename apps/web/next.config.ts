import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@soufi/content", "@soufi/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "eeqwxxstrmnqurmtbhfj.supabase.co" },
      { protocol: "https", hostname: "cdn.iavance.fr" },
    ],
  },
  experimental: {
    typedRoutes: false,
  },
};

export default config;
