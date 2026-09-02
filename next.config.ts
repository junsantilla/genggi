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
        serverActions: {
            bodySizeLimit: "4mb",
        },
    },
};

export default nextConfig;
