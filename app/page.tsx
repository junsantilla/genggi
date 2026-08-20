import { getCurrentUser } from "@/lib/auth";
import Profile from "@/app/components/Profile";
import Landing from "@/app/components/Landing";
import NewMembers from "@/app/components/NewMembers";

export default async function Home() {
    const user = await getCurrentUser();
    if (!user) return <Landing />;

    return (
        <div className="max-w-[960px] w-full mx-auto">
            <Profile user={user} currentUser={user} />
            <div className="bg-white border border-[#6699cc] sm:border-x p-2.5 mt-3">
                <NewMembers excludeId={user._id.toString()} />
            </div>
        </div>
    );
}
