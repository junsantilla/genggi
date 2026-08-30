import Link from "next/link";
import { getDb, ObjectId } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import Box from "./Box";
import UserAvatar from "./UserAvatar";
import { displayNameOrUsername } from "@/lib/utils";

export default async function NewMembers({
    limit = 10,
    excludeId,
    border = "#6699cc",
}: {
    limit?: number;
    excludeId?: string;
    border?: string;
}) {
    const db = getDb();
    const filter: Record<string, unknown> = {
        banned: { $ne: true },
        hideFromSearch: { $ne: true },
        // Only hide accounts created after email verification was added; older
        // accounts have no emailVerified field and should still be shown.
        emailVerified: { $ne: false },
    };
    if (excludeId) filter._id = { $ne: new ObjectId(excludeId) };

    const users = await db
        .collection("users")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    return (
        <Box title="New Members" border={border} bg="#f5f9ff">
            {users.length === 0 ? (
                <span className="text-gray-500 italic ">
                    No members yet — be the first to join!
                </span>
            ) : (
                <div className="divide-y divide-[#d5e2f2]">
                    {users.map((u) => (
                        <div
                            key={u._id.toString()}
                            className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0 text-[11px]"
                        >
                            <Link href={`/${u.username}`} className="shrink-0">
                                <UserAvatar
                                    src={u.photo}
                                    alt={displayNameOrUsername(u.displayName, u.username)}
                                    className="w-10 h-10 object-cover"
                                    cloudinaryWidth={100}
                                />
                            </Link>
                            <div className="min-w-0">
                                <Link
                                    href={`/${u.username}`}
                                    className="text-[#003399] no-underline font-bold break-words"
                                >
                                    {displayNameOrUsername(u.displayName, u.username)}
                                </Link>
                                <div className="text-gray-500">
                                    {timeAgo(u.createdAt)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="text-left mt-2">
                <Link
                    href="/members"
                    className="text-[#003399] no-underline hover:underline"
                >
                    View All Members »
                </Link>
            </div>
        </Box>
    );
}
