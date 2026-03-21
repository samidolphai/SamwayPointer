import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Imgur logo image
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.imgur.com' },
    ],
  },
};

export default nextConfig;
