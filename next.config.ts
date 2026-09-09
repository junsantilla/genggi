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
        // Video uploads use a Route Handler rather than a Server Action. This
        // also prevents Next's proxy from truncating the raw video body at its
        // 10 MB default before the handler can stream it to R2.
        proxyClientMaxBodySize: "110mb",
        serverActions: {
            bodySizeLimit: "4mb",
            // The production site is served through a proxy that can report a
            // different host to Next.js than the browser's public origin.
            allowedOrigins: ["genggi.com", "www.genggi.com"],
        },
    },
};

export default nextConfig;
