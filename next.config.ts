import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/u/:username",
        destination: "/:username",
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
