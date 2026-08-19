import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import Profile from "@/app/components/Profile";
import ProfileViewTracker from "@/app/components/ProfileViewTracker";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const db = getDb();
  const user = (await db.collection("users").findOne({ username })) as User | null;
  if (!user) notFound();

  const current = await getCurrentUser();

  return (
    <>
      <ProfileViewTracker username={user.username} />
      <Profile user={user} currentUser={current} />
    </>
  );
}
