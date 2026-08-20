import Link from "next/link";
import { getDb, ObjectId } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import Box from "./Box";

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
    };
    if (excludeId) filter._id = { $ne: new ObjectId(excludeId) };

    const users = await db
        .collection("users")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    return (
        <Box title="✨ New Members" border={border} bg="#f5f9ff">
            {users.length === 0 ? (
                <span className="text-gray-500 italic text-[11px]">
                    No members yet — be the first to join!
                </span>
            ) : (
                <div className="grid grid-cols-2 min-[361px]:grid-cols-3 sm:grid-cols-5 gap-5">
                    {users.map((u) => (
                        <div
                            key={u._id.toString()}
                            className="text-center text-[10px]"
                        >
                            <Link href={`/u/${u.username}`} className="block">
                                {u.photo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={u.photo}
                                        alt={u.displayName}
                                        className="w-[60px] h-[60px] object-cover border border-[#cc99cc] mx-auto mb-0.5"
                                    />
                                ) : (
                                    <div className="friend-thumb-bg w-[60px] h-[60px] border border-[#cc99cc] mx-auto mb-0.5"></div>
                                )}
                            </Link>
                            <Link
                                href={`/u/${u.username}`}
                                className="text-[#003399] no-underline font-bold"
                            >
                                {u.displayName}
                            </Link>
                            <div className="text-gray-500">
                                joined {timeAgo(u.createdAt)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Box>
    );
}
