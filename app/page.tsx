import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import Landing from "@/app/components/Landing";
import NewMembers from "@/app/components/NewMembers";
import BulletinBoard from "@/app/components/BulletinBoard";
import { getHomeBulletinPosts } from "@/lib/bulletin";

export const metadata: Metadata = {
  title: {
    absolute: "Welcome to genggeng.pro",
  },
  description:
    "The nostalgic social network. Make a profile, add friends, send messages, poke people, and collect testimonials — just like the good old days.",
  keywords: [
    "social network",
    "nostalgia",
    "profiles",
    "friends",
    "messages",
    "testimonials",
    "genggeng.pro",
  ],
  openGraph: {
    title: "Welcome to genggeng.pro",
    description:
      "The nostalgic social network. Make a profile, add friends, send messages, and collect testimonials — just like the good old days.",
    siteName: "genggeng.pro",
    type: "website",
  },
};

export default async function Home() {
    const user = await getCurrentUser();
    if (!user) return <Landing />;

    const posts = await getHomeBulletinPosts(user._id.toString());

    return (
        <div className="max-w-[960px] w-full mx-auto">
            <div className="bg-white border border-[#6699cc] sm:border-x p-2.5">
                <BulletinBoard
                    posts={posts}
                    currentUserId={user._id.toString()}
                    currentUsername={user.username}
                    showComposer
                />
                <NewMembers excludeId={user._id.toString()} />
            </div>
        </div>
    );
}
