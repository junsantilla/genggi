"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { displayNameOrUsername } from "@/lib/utils";
import type { MentionFriend } from "@/lib/types";
import UserAvatar from "./UserAvatar";

const MAX_RESULTS = 8;

function matchesFriend(friend: MentionFriend, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;

    return [
        friend.username,
        friend.displayName,
        friend.firstName,
        friend.lastName,
    ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function MessageRecipientSearch({
    friends,
}: {
    friends: MentionFriend[];
}) {
    const [query, setQuery] = useState("");
    const results = useMemo(
        () => friends.filter((friend) => matchesFriend(friend, query)),
        [friends, query],
    );
    const visibleResults = results.slice(0, MAX_RESULTS);

    return (
        <div className="relative mt-2">
            <form action="/messages" method="get" className="flex gap-1.5">
                <div className="relative min-w-0 flex-1">
                    <input
                        name="to"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search friends by username or name..."
                        className="input w-full"
                        autoComplete="off"
                        aria-label="Search friends to message"
                        aria-controls={
                            query ? "message-recipient-suggestions" : undefined
                        }
                        aria-expanded={query ? "true" : "false"}
                    />
                    {query && (
                        <div
                            id="message-recipient-suggestions"
                            role="listbox"
                            aria-label="Friends to message"
                            className="absolute left-0 right-0 top-full z-30 mt-1 border border-[#6699cc] bg-white shadow-md"
                        >
                            {visibleResults.length === 0 ? (
                                <div className="px-2 py-1.5 text-[11px] text-gray-500 italic">
                                    No friends match “{query}”
                                </div>
                            ) : (
                                <ul className="max-h-[220px] overflow-y-auto py-0.5">
                                    {visibleResults.map((friend) => (
                                        <li key={friend._id}>
                                            <Link
                                                href={`/messages?to=${encodeURIComponent(friend.username)}`}
                                                role="option"
                                                className="flex items-center gap-2 px-2 py-1.5 text-left no-underline hover:bg-[#DBE9F7]"
                                            >
                                                <UserAvatar
                                                    src={friend.photo}
                                                    alt={displayNameOrUsername(
                                                        friend.displayName,
                                                        friend.username,
                                                    )}
                                                    className="w-7 h-7 object-cover shrink-0"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[12px] font-bold text-[#003399] leading-tight">
                                                        {displayNameOrUsername(
                                                            friend.displayName,
                                                            friend.username,
                                                        )}
                                                    </span>
                                                    <span className="block truncate text-[11px] text-gray-500 leading-tight">
                                                        @{friend.username}
                                                    </span>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {results.length > MAX_RESULTS && (
                                <div className="border-t border-dotted border-[#99bbdd] px-2 py-1 text-[10px] text-gray-500">
                                    Keep typing to narrow results…
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <button type="submit" className="btn">
                    Compose
                </button>
            </form>
        </div>
    );
}
