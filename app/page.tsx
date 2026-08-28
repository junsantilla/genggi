import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import Landing from "@/app/components/Landing";
import NewMembers from "@/app/components/NewMembers";
import BulletinFeed from "@/app/components/BulletinFeed";
import { getBulletinFeedPage } from "@/lib/bulletin";

export const metadata: Metadata = {
    title: {
        absolute: "Welcome to Genggi",
    },
    description:
        "The nostalgic social network. Make a custom profile, add friends, send messages, poke people, and collect testimonials — just like the good old days.",
    keywords: [
        "social network",
        "nostalgia",
        "profiles",
        "friends",
        "messages",
        "testimonials",
        "genggi",
    ],
    openGraph: {
        title: "Welcome to genggi",
        description:
            "The nostalgic social network. Make a profile, add friends, send messages, and collect testimonials — just like the good old days.",
        siteName: "genggi",
        type: "website",
    },
};

export default async function Home() {
    const user = await getCurrentUser();
    if (!user) return <Landing />;

    const feed = await getBulletinFeedPage(user._id.toString(), null);

    return (
        <div className="max-w-[960px] w-full mx-auto">
            <div className="bg-white border border-[#6699cc] sm:border-x">
                <div className="flex flex-wrap w-full">
                    <div className="w-full sm:w-2/3 p-2.5 pb-0 sm:pb-2.5 sm:pr-[5px]">
                        <BulletinFeed
                            initialPosts={feed.posts}
                            hasMore={feed.nextCursor !== null}
                            currentUserId={user._id.toString()}
                            currentUsername={user.username}
                        />
                    </div>
                    <div className="w-full sm:w-1/3 p-2.5 pt-0 sm:pt-2.5 sm:pl-[5px]">
                        <NewMembers limit={9} excludeId={user._id.toString()} />
                    </div>
                </div>
            </div>
        </div>
    );
}
