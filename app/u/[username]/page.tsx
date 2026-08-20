import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import Profile from "@/app/components/Profile";
import ProfileViewTracker from "@/app/components/ProfileViewTracker";

async function getUser(username: string): Promise<User | null> {
  return (await getDb().collection("users").findOne({ username })) as User | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await getUser(username);

  if (!user) {
    return {
      title: "Profile not found",
      description: "This genggeng.pro profile could not be found.",
    };
  }

  const title = `${user.displayName} (@${user.username})`;
  const about = user.aboutMe?.replace(/\s+/g, " ").trim();
  const description = about
    ? about.slice(0, 160)
    : `${user.displayName}'s nostalgic profile on genggeng.pro.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | genggeng.pro`,
      description,
      type: "profile",
      ...(user.photo
        ? { images: [{ url: user.photo, alt: `${user.displayName}'s profile photo` }] }
        : {}),
    },
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getUser(username);
  if (!user) notFound();

  const current = await getCurrentUser();

  return (
    <>
      <ProfileViewTracker username={user.username} />
      <Profile user={user} currentUser={current} />
    </>
  );
}
