import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Dockerfile's lean standalone runner stage
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
