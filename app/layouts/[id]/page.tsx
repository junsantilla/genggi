import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId, getDb } from "@/lib/db";
import Box from "@/app/components/Box";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    let layoutId: ObjectId;
    try {
        layoutId = new ObjectId(id);
    } catch {
        return { title: "Layout not found | Genggi" };
    }
    const layout = await getDb()
        .collection("layouts")
        .findOne({ _id: layoutId });
    if (!layout) return { title: "Layout not found | Genggi" };
    const name = String(layout.name);
    const description = String(
        layout.description || `View the ${name} profile layout on Genggi.`,
    );
    return {
        title: `${name} | Genggi Profile Layouts`,
        description,
        keywords: ["profile layout", "profile CSS", "Genggi", name],
        openGraph: {
            title: `${name} | Genggi Profile Layouts`,
            description,
            type: "article",
            images: layout.screenshot
                ? [{ url: String(layout.screenshot) }]
                : undefined,
        },
    };
}

export default async function LayoutDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    let layoutId: ObjectId;
    try {
        layoutId = new ObjectId(id);
    } catch {
        notFound();
    }
    const layout = await getDb()
        .collection("layouts")
        .findOne({ _id: layoutId });
    if (!layout) notFound();

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center">
                {String(layout.name)}
            </div>
            <div className="p-4">
                <Link
                    href="/layouts"
                    className="text-[#003399] font-bold no-underline hover:underline"
                >
                    ← Back to layouts
                </Link>
                <div className="mb-2"></div>
                <Box title="Layout preview">
                    {layout.screenshot ? (
                        <img
                            src={optimizeCloudinaryUrl(
                                String(layout.screenshot),
                                { width: 1200 },
                            )}
                            alt={`${layout.name} screenshot`}
                            className="mx-auto max-h-[900px] max-w-full object-contain"
                        />
                    ) : (
                        <p>No screenshot available.</p>
                    )}
                </Box>
                <Box title="Details">
                    <p>
                        {String(
                            layout.description || "No description provided.",
                        )}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                        Posted by{" "}
                        <Link
                            href={`/${String(layout.authorUsername || "member")}`}
                            className="font-bold text-[#003399] no-underline hover:underline"
                        >
                            {String(layout.authorUsername || "member")}
                        </Link>
                    </p>
                </Box>
                <Box title="CSS">
                    <pre className="overflow-auto whitespace-pre-wrap bg-[#f5f9ff] p-2 text-xs">
                        {String(layout.css || "")}
                    </pre>
                </Box>
            </div>
        </div>
    );
}
