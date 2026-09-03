import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { normalizeUsername } from "@/lib/usernames";
import { getDb } from "@/lib/db";
import { areFriends } from "@/lib/queries";
import type { User } from "@/lib/types";
import Box from "@/app/components/Box";
import UserAvatar from "@/app/components/UserAvatar";

async function getUser(username: string): Promise<User | null> {
    const normalizedUsername = normalizeUsername(username);
    return (await getDb()
        .collection("users")
        .findOne({ username: normalizedUsername })) as User | null;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ username: string }>;
}): Promise<Metadata> {
    const { username } = await params;
    const user = await getUser(username);
    return {
        title: user ? `${user.displayName}'s Friends` : "Friends",
        description: user
            ? `View ${user.displayName}'s friends on Genggi.`
            : "Friends on Genggi.",
    };
}

export default async function ProfileFriendsPage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;
    const profile = await getUser(username);
    if (!profile) notFound();

    const currentUser = await getCurrentUser();
    const currentId = currentUser?._id.toString();
    const profileId = profile._id.toString();
    const canView =
        !profile.isPrivate ||
        currentId === profileId ||
        (!!currentId && (await areFriends(currentId, profileId)));

    return (
        <main className="w-full px-2 py-2">
            <div className="mx-auto w-full max-w-[960px] border border-[#6699cc] bg-white">
                <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                    <Link
                        href={`/${profile.username}`}
                        className="text-white no-underline"
                    >
                        {profile.displayName}
                    </Link>
                    &apos;s Friends
                </div>

                {!canView ? (
                    <div className="p-6 text-center">
                        <p className="mb-1 text-lg font-bold text-[#2c4d80]">
                            🔒 This profile is private
                        </p>
                        <p className="text-[13px] text-gray-500">
                            {profile.displayName} only shares their friends list
                            with friends.
                        </p>
                    </div>
                ) : (
                    <ProfileFriendsList profile={profile} />
                )}
            </div>
        </main>
    );
}

async function ProfileFriendsList({ profile }: { profile: User }) {
    const db = getDb();
    const profileId = profile._id.toString();
    const friendships = await db
        .collection("friendships")
        .find({
            status: "approved",
            $or: [{ requesterId: profile._id }, { addresseeId: profile._id }],
        })
        .sort({ respondedAt: -1, createdAt: -1 })
        .toArray();

    const friendIds = friendships.map((friendship) =>
        friendship.requesterId.toString() === profileId
            ? friendship.addresseeId
            : friendship.requesterId,
    );
    const friends = friendIds.length
        ? await db
              .collection("users")
              .find({ _id: { $in: friendIds }, hideFromSearch: { $ne: true } })
              .project({ _id: 1, username: 1, displayName: 1, photo: 1 })
              .toArray()
        : [];

    return (
        <div className="p-3 sm:p-4">
            <Box title={`Friends (${friends.length})`}>
                {friends.length === 0 ? (
                    <div className="py-5 text-center text-[13px] text-gray-500">
                        <p className="mb-1 font-bold text-[#2c4d80]">
                            No friends yet
                        </p>
                        <p>
                            {profile.displayName} hasn&apos;t added any friends.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
                        {friends.map((friend) => (
                            <Link
                                key={friend._id.toString()}
                                href={`/${friend.username}`}
                                className="group min-w-0 border border-[#b8cde5] bg-[#f5f9ff] p-2 text-center no-underline transition-colors hover:border-[#6699cc] hover:bg-[#dbe9f7]"
                            >
                                <UserAvatar
                                    src={friend.photo}
                                    alt={`${friend.displayName}'s photo`}
                                    className="mx-auto mb-1 h-[72px] w-[72px] object-cover sm:h-[84px] sm:w-[84px]"
                                    cloudinaryWidth={168}
                                />
                                <span className="block break-words text-[13px] font-bold text-[#003399] group-hover:underline">
                                    {friend.displayName}
                                </span>
                                <span className="block break-all text-[11px] text-gray-500">
                                    @{friend.username}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </Box>
            <div className="mt-3 text-center text-[13px]">
                <Link href={`/${profile.username}`} className="text-[#003399]">
                    ← Back to {profile.displayName}&apos;s profile
                </Link>
            </div>
        </div>
    );
}
