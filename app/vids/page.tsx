import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getVidById, getVidsFeedPage } from "@/lib/vids";
import VidsFeed from "@/app/components/VidsFeed";

export const metadata: Metadata = {
    title: "Vids",
    description:
        "Short vertical videos on Genggi — watch, like, comment, and share Vids from across the community.",
};

// Supports deep-linking into the scrollable feed: /vids?v=<vidId> lands on
// that Vid's slide so the viewer can keep swiping through the rest.
export default async function VidsPage({
    searchParams,
}: {
    searchParams: Promise<{ v?: string }>;
}) {
    const { v } = await searchParams;
    const user = await getCurrentUser();
    const viewerId = user?._id.toString() ?? null;
    const feed = await getVidsFeedPage(viewerId, null);

    let initialVideos = feed.videos;
    let startAtVidId: string | null = null;
    if (v) {
        const target = await getVidById(v, viewerId);
        if (target) {
            startAtVidId = target._id;
            initialVideos = [
                target,
                ...feed.videos.filter((vid) => vid._id !== target._id),
            ];
        }
    }

    return (
        // -my-2 compensates the root layout's main py-2 so the feed fills the
        // viewport below the navbar on every screen size.
        <div
            className={`${user ? "-my-2" : ""} vids-page h-[calc(100dvh-81px)] w-full`}
        >
            <VidsFeed
                initialVideos={initialVideos}
                startAtVidId={startAtVidId}
                hasMore={feed.nextCursor !== null}
                isLoggedIn={!!user}
                currentUserId={user?._id.toString()}
            />
            {user && (
                <Link
                    href="/vids/upload"
                    className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#cc3399] text-white shadow-lg transition-transform hover:scale-105"
                    aria-label="Upload a Vid"
                    title="Upload a Vid"
                >
                    <Plus size={24} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}
