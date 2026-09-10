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

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin-allow-popups",
                    },
                ],
            },
        ];
    },

    experimental: {
        // Video bytes go directly from the browser to R2 via presigned URLs
        // (Vercel Functions cap bodies at ~4.5 MB, so proxying 100 MB videos
        // is impossible). Only thumbnails (~2 MB) and JSON pass through
        // Next.js, so a small proxy budget is enough.
        proxyClientMaxBodySize: "5mb",
        serverActions: {
            bodySizeLimit: "4mb",
            // The production site is served through a proxy that can report a
            // different host to Next.js than the browser's public origin.
            allowedOrigins: ["genggi.com", "www.genggi.com"],
        },
    },
};

export default nextConfig;
