import { getCurrentUser } from "@/lib/auth";
import Profile from "@/app/components/Profile";
import Landing from "@/app/components/Landing";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  return (
    <div className="max-w-[960px] w-full mx-auto">
      <Profile user={user} currentUser={user} />
    </div>
  );
}
