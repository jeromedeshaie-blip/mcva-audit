import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    // Enable server actions if needed later
  },

  // Allow external images if needed
  images: {
    remotePatterns: [],
  },

  // Ensure Inngest route is not cached
  async headers() {
    return [
      {
        source: "/api/inngest",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
