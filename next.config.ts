import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://va.vercel-scripts.com; img-src 'self' data: blob: https://res.cloudinary.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src https://www.youtube-nocookie.com; media-src 'self' https://www.youtube-nocookie.com; upgrade-insecure-requests" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/api/youtube-title",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
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
