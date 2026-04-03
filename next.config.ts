import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize Chromium + Puppeteer so their binaries survive bundling
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {},

  // Force include Chromium brotli binaries in the serverless function
  outputFileTracingIncludes: {
    "/api/audit/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
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
