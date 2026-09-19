import Link from "next/link";
import { getSidebarGroups } from "@/lib/group";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";
import Box from "./Box";

export const SIDEBAR_GROUPS_LIMIT = 5;

// Homepage / group-page sidebar: at most 5 groups — groups the viewer is a
// member of first, then the newest public groups to fill the rest.
export default async function SidebarGroups({
    userId,
    limit = SIDEBAR_GROUPS_LIMIT,
    border = "#6699cc",
}: {
    userId: string;
    limit?: number;
    border?: string;
}) {
    const groups = await getSidebarGroups(userId, limit);

    return (
        <Box title="Groups" border={border} bg="#f5f9ff">
            {groups.length === 0 ? (
                <span className="text-gray-500 italic ">
                    No groups yet — be the first to create one!
                </span>
            ) : (
                <div className="divide-y divide-[#d5e2f2]">
                    {groups.map((group) => (
                        <div
                            key={group._id}
                            className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0 text-[11px]"
                        >
                            <Link
                                href={`/groups/${group._id}`}
                                className="shrink-0"
                            >
                                {group.photo ? (
                                    <img
                                        src={
                                            optimizeCloudinaryUrl(group.photo, {
                                                width: 100,
                                                height: 100,
                                            }) ?? group.photo
                                        }
                                        alt=""
                                        className="w-10 h-10 object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-[#dbe9f7] flex items-center justify-center text-xl">
                                        👥
                                    </div>
                                )}
                            </Link>
                            <div className="min-w-0">
                                <Link
                                    href={`/groups/${group._id}`}
                                    className="text-[#003399] no-underline font-bold break-words"
                                >
                                    {group.name}
                                </Link>
                                <div className="text-gray-500">
                                    {group.privacy === "private"
                                        ? "Private"
                                        : "Public"}
                                    {group.isMember ? " · Member" : ""}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="text-left mt-2">
                <Link
                    href="/groups"
                    className="text-[#003399] no-underline hover:underline"
                >
                    View All Groups »
                </Link>
            </div>
        </Box>
    );
}
