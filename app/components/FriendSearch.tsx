"use client";

import { displayNameOrUsername } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import UserAvatar from "./UserAvatar";
import ActionButton from "./ActionButton";
import { removeFriendAction } from "@/app/actions";

export interface FriendEntry {
    _id: string;
    username: string;
    displayName: string;
    photo?: string | null;
    friendshipId: string;
}

export default function FriendSearch({
    friends,
}: {
    friends: FriendEntry[];
}) {
    const [q, setQ] = useState("");
    const trimmed = q.trim().toLowerCase();
    const filtered = trimmed
        ? friends.filter(
              (f) =>
                  displayNameOrUsername(f.displayName, f.username)
                      .toLowerCase()
                      .includes(trimmed) ||
                  f.username.toLowerCase().includes(trimmed),
          )
        : friends;

    return (
        <div>
            <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search your friends…"
                className="input w-full"
            />
            <div className="mt-2">
                {friends.length === 0 ? (
                    <p className="text-gray-500 italic">No friends yet.</p>
                ) : filtered.length === 0 ? (
                    <p className="text-gray-500 italic">No friends match “{q}”.</p>
                ) : (
                    filtered.map((f) => (
                        <div
                            key={f._id}
                            className="flex items-center justify-between gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0"
                        >
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/${f.username}`}
                                    className="flex shrink-0"
                                >
                                    <UserAvatar
                                        src={f.photo}
                                        alt={f.displayName}
                                        className="w-9 h-9 object-cover"
                                    />
                                </Link>
                                <Link
                                    href={`/${f.username}`}
                                    className="text-[#003399] font-bold no-underline"
                                >
                                    {f.displayName}
                                </Link>
                            </div>
                            <div className="flex gap-1.5">
                                <Link
                                    href={`/messages?to=${f.username}`}
                                    className="btn no-underline"
                                >
                                    Message
                                </Link>
                                <ActionButton
                                    action={removeFriendAction.bind(
                                        null,
                                        f.friendshipId,
                                    )}
                                    className="btn btn-danger"
                                    confirmText={`Remove ${f.displayName} as a friend?`}
                                >
                                    Remove
                                </ActionButton>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
