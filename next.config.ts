import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Album covers for the footer's "Last played" (Spotify CDN).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "i.scdn.co", pathname: "/image/**" }],
  },
  turbopack: {
    rules: {
      // Tailwind for the global stylesheet only; CSS modules keep Next's own
      // module pipeline (routing them "as *.css" would strip their class names).
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
