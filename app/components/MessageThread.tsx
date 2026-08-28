"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { deleteMessageAction, getOlderMessagesAction } from "@/app/actions";
import type { SerializedMessage } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import ActionButton from "./ActionButton";
import UserAvatar from "./UserAvatar";

// Groups messages under "Today" / "Yesterday" / a full date label,
// the way most chat apps do, so long threads are easier to scan.
function dayLabel(date: Date) {
    const now = new Date();
    const startOf = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round(
        (startOf(now) - startOf(date)) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

export default function MessageThread({
    threadId,
    other,
    myId,
    myPhoto,
    initialMessages,
    hasMoreInitial,
}: {
    threadId: string;
    other: { displayName: string; photo: string | null };
    myId: string;
    myPhoto: string | null;
    initialMessages: SerializedMessage[];
    hasMoreInitial: boolean;
}) {
    const [messages, setMessages] = useState(initialMessages);
    const [hasMore, setHasMore] = useState(hasMoreInitial);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const latestSeenRef = useRef<string | null>(
        initialMessages.length > 0
            ? initialMessages[initialMessages.length - 1]._id
            : null,
    );

    // Scroll to the latest message on first paint.
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, []);

    // After the server re-renders (e.g. a message was sent), append any
    // messages we don't have yet and scroll down to them.
    useEffect(() => {
        const lastProp =
            initialMessages[initialMessages.length - 1] ?? null;
        if (!lastProp || lastProp._id === latestSeenRef.current) return;
        setMessages((prev) => {
            const known = new Set(prev.map((m) => m._id));
            const fresh = initialMessages.filter(
                (m) => !known.has(m._id),
            );
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
        latestSeenRef.current = lastProp._id;
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [initialMessages]);

    const loadOlder = async () => {
        if (loadingOlder || !hasMore) return;
        const el = scrollRef.current;
        const prevHeight = el?.scrollHeight ?? 0;
        const oldest = messages[0];
        setLoadingOlder(true);
        try {
            const res = await getOlderMessagesAction(
                threadId,
                oldest
                    ? { createdAt: oldest.createdAt, _id: oldest._id }
                    : null,
            );
            if (res.messages.length > 0) {
                setMessages((prev) => [...res.messages, ...prev]);
                // Keep the viewport on the same messages after prepending.
                requestAnimationFrame(() => {
                    if (el) el.scrollTop = el.scrollHeight - prevHeight;
                });
            }
            setHasMore(!!res.nextCursor);
        } finally {
            setLoadingOlder(false);
        }
    };

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el || loadingOlder || !hasMore) return;
        if (el.scrollTop <= 80) void loadOlder();
    };

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-3 bg-[#eef3fa]"
        >
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2">
                    <UserAvatar
                        src={other.photo}
                        alt={other.displayName}
                        className="w-14 h-14 object-cover rounded-full opacity-70"
                    />
                    <p className="italic">
                        No messages yet — say hi to {other.displayName}!
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-1">
                    {hasMore && !loadingOlder && (
                        <div className="flex justify-center my-1">
                            <button
                                type="button"
                                onClick={() => void loadOlder()}
                                className="text-[11px] text-[#003399] underline p-0 border-0 bg-transparent cursor-pointer"
                            >
                                Load older messages
                            </button>
                        </div>
                    )}
                    {loadingOlder && (
                        <div className="text-center text-[11px] text-gray-500 my-1">
                            Loading older messages…
                        </div>
                    )}
                    {messages.map((m, i) => {
                        const mine = m.senderId === myId;
                        const created = new Date(m.createdAt);
                        const prev =
                            i > 0 ? new Date(messages[i - 1].createdAt) : null;
                        const showDateDivider =
                            !prev || dayLabel(prev) !== dayLabel(created);
                        const isLastMine =
                            mine &&
                            (i === messages.length - 1 ||
                                messages[i + 1].senderId !== myId);

                        return (
                            <div key={m._id}>
                                {showDateDivider && (
                                    <div className="flex items-center gap-2 my-3">
                                        <div className="h-px bg-[#c3d4e8] flex-1" />
                                        <span className="text-[11px] text-gray-500 font-semibold px-1">
                                            {dayLabel(created)}
                                        </span>
                                        <div className="h-px bg-[#c3d4e8] flex-1" />
                                    </div>
                                )}

                                <div
                                    className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                                >
                                    <UserAvatar
                                        src={mine ? myPhoto : other.photo}
                                        alt={mine ? "You" : other.displayName}
                                        className="w-6 h-6 object-cover rounded-full shrink-0 mb-4"
                                    />

                                    <div
                                        className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${mine ? "items-end" : "items-start"}`}
                                    >
                                        <div
                                            className={`px-3 py-1.5 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm ${
                                                mine
                                                    ? "bg-[#cc3399] text-white rounded-br-sm"
                                                    : "bg-white border border-[#c3d4e8] text-[#1a1a1a] rounded-bl-sm"
                                            }`}
                                        >
                                            {m.body}
                                        </div>
                                        <div
                                            className={`flex items-center gap-2 mt-0.5 px-1 text-[10px] text-gray-400 ${mine ? "flex-row-reverse" : ""}`}
                                        >
                                            <span
                                                title={created.toLocaleString()}
                                            >
                                                {timeAgo(m.createdAt)}
                                            </span>
                                            {mine && (
                                                <ActionButton
                                                    action={deleteMessageAction.bind(
                                                        null,
                                                        m._id,
                                                    )}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 underline-offset-2 hover:underline"
                                                    confirmText="Delete this message?"
                                                    onSuccess={() =>
                                                        setMessages((prev) =>
                                                            prev.filter(
                                                                (item) =>
                                                                    item._id !==
                                                                    m._id,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </ActionButton>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isLastMine && <div className="h-0.5" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}