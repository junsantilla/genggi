import Link from "next/link";
import { displayNameOrUsername } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { GENDERS, STATUSES } from "@/lib/utils";
import { getFriendshipStatus } from "@/lib/queries";
import { sendFriendRequestAction } from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import Box from "@/app/components/Box";
import UserAvatar from "@/app/components/UserAvatar";

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string;
        gender?: string;
        location?: string;
        interests?: string;
        status?: string;
    }>;
}) {
    const user = await requireUser();
    const sp = await searchParams;
    const q = (sp.q || "").trim().toLowerCase();
    const gender = sp.gender || "";
    const location = (sp.location || "").trim().toLowerCase();
    const interests = (sp.interests || "").trim().toLowerCase();
    const status = sp.status || "";

    const db = getDb();
    const filter: Record<string, unknown> = {
        hideFromSearch: { $ne: true },
        banned: { $ne: true },
        _id: { $ne: user._id },
    };
    if (q) {
        filter.$or = [
            { username: { $regex: q, $options: "i" } },
            { displayName: { $regex: q, $options: "i" } },
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
        ];
    }
    if (gender) filter.gender = gender;
    if (location) filter.location = { $regex: location, $options: "i" };
    if (status) filter.relationshipStatus = status;
    if (interests) filter.interests = { $in: [interests] };

    const results = await db
        .collection("users")
        .find(filter)
        .sort({ lastActive: -1 })
        .limit(50)
        .toArray();

    const statuses = await Promise.all(
        results.map((r) =>
            getFriendshipStatus(user._id.toString(), r._id.toString()),
        ),
    );

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                Search Users
            </div>
            <div className="p-4 flex flex-col gap-4">
                <Box title="Filters">
                    <form
                        action="/search"
                        method="get"
                        className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
                    >
                        <input
                            name="q"
                            defaultValue={q}
                            placeholder="Name or username"
                            className="input"
                        />
                        <select
                            name="gender"
                            defaultValue={gender}
                            className="input"
                        >
                            {GENDERS.map((g) => (
                                <option key={g || "any"} value={g}>
                                    {g ? g : "Any gender"}
                                </option>
                            ))}
                        </select>
                        <input
                            name="location"
                            defaultValue={location}
                            placeholder="Location (e.g. San Jose)"
                            className="input"
                        />
                        <select
                            name="status"
                            defaultValue={status}
                            className="input"
                        >
                            <option value="">Any status</option>
                            {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                        <input
                            name="interests"
                            defaultValue={interests}
                            placeholder="Interest (e.g. LAN parties)"
                            className="input"
                        />
                        <button type="submit" className="btn">
                            Search
                        </button>
                    </form>
                </Box>

                <Box title={`Results (${results.length})`}>
                    {results.length === 0 ? (
                        <p className="text-gray-500 italic ">No users found.</p>
                    ) : (
                        results.map((r, i) => (
                            <div
                                key={r._id.toString()}
                                className="flex items-center justify-between gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0"
                            >
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/${r.username}`}
                                        className="flex shrink-0"
                                    >
                                        <UserAvatar
                                            src={r.photo}
                                            alt={displayNameOrUsername(r.displayName, r.username)}
                                            className="w-9 h-9 object-cover"
                                        />
                                    </Link>
                                    <div>
                                        <Link
                                            href={`/${r.username}`}
                                            className="text-[#003399] font-bold no-underline"
                                        >
                                            {displayNameOrUsername(r.displayName, r.username)}
                                        </Link>
                                        <div className="text-gray-500 text-[11px]">
                                            {[
                                                r.location,
                                                r.gender,
                                                r.relationshipStatus,
                                            ]
                                                .filter(Boolean)
                                                .join(" · ") || r.username}
                                            {r.interests?.length
                                                ? ` · ${r.interests.slice(0, 3).join(", ")}`
                                                : ""}
                                        </div>
                                    </div>
                                </div>
                                <span className="shrink-0 text-right">
                                    {statuses[i] === "friends" ? (
                                        <span className="text-[11px] text-gray-500">
                                            friends
                                        </span>
                                    ) : statuses[i] === "pending_out" ? (
                                        <span className="text-[11px] text-gray-500">
                                            requested
                                        </span>
                                    ) : statuses[i] === "pending_in" ? (
                                        <span className="text-[11px] text-gray-500">
                                            requested you
                                        </span>
                                    ) : r.whoCanFriendRequest !== "nobody" ? (
                                        <ActionButton
                                            action={sendFriendRequestAction.bind(
                                                null,
                                                r._id.toString(),
                                            )}
                                            className="btn"
                                        >
                                            + Add as Friend
                                        </ActionButton>
                                    ) : (
                                        <span className="text-[11px] text-gray-500">
                                            not accepting
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))
                    )}
                </Box>
            </div>
        </div>
    );
}
