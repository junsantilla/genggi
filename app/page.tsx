import { getCurrentUser } from "@/lib/auth";
import Landing from "@/app/components/Landing";
import NewMembers from "@/app/components/NewMembers";

export default async function Home() {
    const user = await getCurrentUser();
    if (!user) return <Landing />;

    return (
        <div className="max-w-[960px] w-full mx-auto">
            <div className="bg-white border border-[#6699cc] sm:border-x p-2.5">
                <NewMembers excludeId={user._id.toString()} />
            </div>
        </div>
    );
}
