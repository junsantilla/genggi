import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import LayoutsGallery from "@/app/components/LayoutsGallery";

export const metadata: Metadata = {
    title: "Profile Layouts | Genggi",
    description:
        "Browse nostalgic profile layouts shared by the Genggi community and find inspiration for your custom profile.",
    keywords: ["profile layouts", "profile CSS", "MySpace layouts", "Genggi"],
    openGraph: {
        title: "Profile Layouts | Genggi",
        description:
            "Browse nostalgic profile layouts shared by the Genggi community.",
        type: "website",
    },
};

export default async function LayoutsPage() {
    const layouts = await getDb()
        .collection("layouts")
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                Layouts
            </div>
            <div className="p-4">
                <LayoutsGallery
            initialLayouts={layouts.map((layout) => ({
                id: layout._id.toString(),
                name: String(layout.name),
                description: String(layout.description || ""),
                screenshot: layout.screenshot ? String(layout.screenshot) : null,
                css: String(layout.css || ""),
                authorUsername: String(layout.authorUsername || "member"),
                authorId: layout.authorId?.toString(),
            }))}
                />
            </div>
        </div>
    );
}
