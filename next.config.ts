import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Allow production builds to succeed even with ESLint issues (style, next rules, etc.)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
