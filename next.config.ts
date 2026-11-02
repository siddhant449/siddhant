import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // AVIF first (smallest), WebP for browsers without it.
    formats: ["image/avif", "image/webp"],
    // 85 is for the work screenshots: small text needs more than the default 75 to stay crisp.
    qualities: [75, 85],
  },
};

export default nextConfig;
