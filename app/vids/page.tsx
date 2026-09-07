import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getVidsFeedPage } from "@/lib/vids";
import VidsFeed from "@/app/components/VidsFeed";

export const metadata: Metadata = {
    title: "Vids",
    description:
        "Short vertical videos on Genggi — watch, like, comment, and share Vids from across the community.",
};

export default async function VidsPage() {
    const user = await getCurrentUser();
    const feed = await getVidsFeedPage(user?._id.toString() ?? null, null);

    return (
        // -my-2 compensates the root layout's main py-2 so the feed fills the
        // viewport below the navbar on every screen size.
        <div
            className={`${user ? "-my-2" : ""} vids-page h-[calc(100dvh-81px)] w-full`}
        >
            <VidsFeed
                initialVideos={feed.videos}
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
