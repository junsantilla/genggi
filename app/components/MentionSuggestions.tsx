"use client";

import { displayNameOrUsername } from "@/lib/utils";
import type { MentionFriend } from "@/lib/types";
import type { MentionContext } from "./useMentionAutocomplete";
import UserAvatar from "./UserAvatar";

export default function MentionSuggestions({
    mention,
    results,
    truncated,
    activeIndex,
    onSelect,
    onHover,
}: {
    mention: MentionContext;
    results: MentionFriend[];
    truncated: boolean;
    activeIndex: number;
    onSelect: (friend: MentionFriend) => void;
    onHover: (index: number) => void;
}) {
    if (!mention) return null;

    return (
        <div
            id="mention-suggestions"
            role="listbox"
            aria-label="Mention a friend"
            className="absolute left-0 right-0 top-full z-30 mt-1 border border-[#6699cc] bg-white shadow-md"
        >
            {results.length === 0 ? (
                <div className="px-2 py-1.5 text-[11px] text-gray-500 italic">
                    No friends match “{mention.query}”
                </div>
            ) : (
                <ul className="max-h-[180px] overflow-y-auto py-0.5">
                    {results.map((friend, index) => (
                        <li key={friend._id}>
                            <button
                                type="button"
                                id={`mention-option-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left ${
                                    index === activeIndex
                                        ? "bg-[#DBE9F7]"
                                        : ""
                                }`}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    onSelect(friend);
                                }}
                                onMouseEnter={() => onHover(index)}
                            >
                                <UserAvatar
                                    src={friend.photo}
                                    alt={displayNameOrUsername(
                                        friend.displayName,
                                        friend.username,
                                    )}
                                    className="w-6 h-6 object-cover shrink-0"
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
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {truncated && (
                <div className="border-t border-dotted border-[#99bbdd] px-2 py-1 text-[10px] text-gray-500">
                    Keep typing to narrow results…
                </div>
            )}
        </div>
    );
}
