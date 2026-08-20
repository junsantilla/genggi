import { getCurrentUser } from "@/lib/auth";
import Landing from "@/app/components/Landing";
import NewMembers from "@/app/components/NewMembers";
import BulletinBoard from "@/app/components/BulletinBoard";
import { getHomeBulletinPosts } from "@/lib/bulletin";

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
