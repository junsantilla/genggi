"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMoreMembersAction } from "@/app/actions";
import { timeAgo } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import { displayNameOrUsername } from "@/lib/utils";

type Member = {
    _id: string;
    username: string;
    displayName: string;
    photo: string | null;
    location?: string;
    gender?: string;
    relationshipStatus?: string;
    createdAt: string;
};

export default function MembersFeed({
    initialMembers,
    initialCursor,
}: {
    initialMembers: Member[];
    initialCursor: { createdAt: string; _id: string } | null;
}) {
    const [members, setMembers] = useState(initialMembers);
    const [cursor, setCursor] = useState(initialCursor);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(!initialCursor);
    const sentinel = useRef<HTMLDivElement>(null);

    const loadMore = useCallback(async () => {
        if (loading || done) return;
        setLoading(true);
        const result = await getMoreMembersAction(cursor);
        setMembers((current) => [...current, ...result.members]);
        setCursor(result.nextCursor);
        setDone(!result.nextCursor);
        setLoading(false);
    }, [cursor, done, loading]);

    useEffect(() => {
        const element = sentinel.current;
        if (!element) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) void loadMore();
            },
            { rootMargin: "0px" },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [loadMore]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {members.map((user) => (
                <div
                    key={user._id}
                    className="flex items-center gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0"
                >
                    <Link href={`/${user.username}`} className="flex shrink-0">
                        <UserAvatar
                            src={user.photo}
                            alt={displayNameOrUsername(user.displayName, user.username)}
                            className="w-14 h-14 object-cover"
                            cloudinaryWidth={112}
                        />
                    </Link>
                    <div className="min-w-0">
                        <Link
                            href={`/${user.username}`}
                            className="text-[#003399] font-bold no-underline break-words"
                        >
                            {displayNameOrUsername(user.displayName, user.username)}
                        </Link>
                        <div className="text-gray-500 text-[11px]">
                            {[
                                user.location,
                                user.gender,
                                user.relationshipStatus,
                            ]
                                .filter(Boolean)
                                .join(" · ") || `@${user.username}`}
                        </div>
                        <div className="text-gray-500 text-[11px]">
                            joined {timeAgo(user.createdAt)}
                        </div>
                    </div>
                </div>
            ))}
            <div
                ref={sentinel}
                className="col-span-full text-center text-[11px] text-gray-500 py-3"
            >
                {loading
                    ? "Loading more members..."
                    : done
                      ? "No more members"
                      : "Scroll down to load more members"}
            </div>
        </div>
    );
}
