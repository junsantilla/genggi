import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Genggi",
        short_name: "Genggi",
        description:
            "A nostalgic social network for profiles, friends, messages, and fun.",
        start_url: "/",
        display: "standalone",
        background_color: "#e5e7eb",
        theme_color: "#2c4d80",
        icons: [
            {
                src: "/images/genggeng-logo4.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/images/genggeng-logo4.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
