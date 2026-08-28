"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
    getChatboxMessagesAction,
    sendChatboxMessageAction,
} from "@/app/actions";
import type { ChatboxMessageCard } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import { displayNameOrUsername } from "@/lib/utils";

function Avatar({
    photo,
    name,
    size = "h-8 w-8 text-[11px]",
}: {
    photo: string | null;
    name: string;
    size?: string;
}) {
    return (
        <UserAvatar
            src={photo}
            alt={name}
            className={`${size} object-cover shrink-0`}
        />
    );
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function snippet(text: string, max = 80): string {
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function ChatboxRoom({
    chatboxId,
    chatboxName,
    viewerId,
    viewerName,
    viewerPhoto,
    initialMessages,
}: {
    chatboxId: string;
    chatboxName: string;
    viewerId: string;
    viewerName: string;
    viewerPhoto: string | null;
    initialMessages: ChatboxMessageCard[];
}) {
    const [messages, setMessages] =
        useState<ChatboxMessageCard[]>(initialMessages);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [replyingTo, setReplyingTo] = useState<ChatboxMessageCard | null>(
        null,
    );
    const [pressedId, setPressedId] = useState<string | null>(null);
    const [highlightId, setHighlightId] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const isAtBottomRef = useRef(true);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdStartRef = useRef<{ x: number; y: number } | null>(null);

    // Auto-scroll only if the user is already near the bottom.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (isAtBottomRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    // Live polling for new messages.
    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;

        const poll = async () => {
            try {
                const res = await getChatboxMessagesAction(chatboxId);

                if (!cancelled) {
                    setMessages(res.messages);
                }
            } catch {
                // Ignore transient poll errors.
            } finally {
                if (!cancelled) {
                    timer = setTimeout(poll, 4000);
                }
            }
        };

        timer = setTimeout(poll, 4000);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [chatboxId]);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;

        const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;

        isAtBottomRef.current = distanceFromBottom < 100;
    };

    // Long-press (hold) on touch screens reveals the reply button, mirroring
    // the hover behavior on desktop.
    const cancelHold = () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        holdStartRef.current = null;
    };

    const startHold = (messageId: string, e: React.TouchEvent) => {
        holdStartRef.current = {
            x: e.touches[0]?.clientX ?? 0,
            y: e.touches[0]?.clientY ?? 0,
        };
        cancelHold();
        holdTimerRef.current = setTimeout(() => {
            setPressedId(messageId);
            holdTimerRef.current = null;
        }, 450);
    };

    const moveHold = (e: React.TouchEvent) => {
        if (!holdStartRef.current || !holdTimerRef.current) return;
        const touch = e.touches[0];
        if (!touch) return;
        if (
            Math.abs(touch.clientX - holdStartRef.current.x) > 12 ||
            Math.abs(touch.clientY - holdStartRef.current.y) > 12
        ) {
            cancelHold();
        }
    };

    const startReply = (m: ChatboxMessageCard) => {
        setReplyingTo(m);
        setPressedId(null);
        inputRef.current?.focus();
    };

    const scrollToMessage = (messageId: string) => {
        const el = document.getElementById(`chatmsg-${messageId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(messageId);
        setTimeout(() => {
            setHighlightId((cur) => (cur === messageId ? null : cur));
        }, 1500);
    };

    const send = async (e: React.FormEvent) => {
        e.preventDefault();

        const body = input.trim();

        if (!body || sending) return;

        setSending(true);
        setError("");

        const formData = new FormData();
        formData.set("body", body);

        try {
            const res = await sendChatboxMessageAction(
                chatboxId,
                replyingTo?._id ?? null,
                { error: "" },
                formData,
            );

            if (res.ok && res.message) {
                setMessages((prev) => [...prev, res.message!]);
                setInput("");
                setReplyingTo(null);

                // Make sure the sender stays at the bottom after sending.
                isAtBottomRef.current = true;

                setTimeout(() => {
                    const el = scrollRef.current;
                    if (el) {
                        el.scrollTop = el.scrollHeight;
                    }
                }, 0);

                inputRef.current?.focus();
            } else if (res.error) {
                setError(res.error);
            }
        } catch {
            setError("Could not send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Message window */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="bg-[#f5f9ff] border border-[#6699cc] overflow-y-auto px-2 py-2 flex flex-col gap-2.5"
                style={{ maxHeight: "50vh", minHeight: "300px" }}
            >
                {messages.length === 0 ? (
                    <p className="text-gray-500 italic  text-center my-auto">
                        No messages yet. Break the ice - say hello!
                    </p>
                ) : (
                    messages.map((m) => {
                        const mine = m.senderId === viewerId;
                        const reply = m.replyTo;

                        return (
                            <div
                                key={m._id}
                                id={`chatmsg-${m._id}`}
                                onTouchStart={(e) => startHold(m._id, e)}
                                onTouchMove={moveHold}
                                onTouchEnd={cancelHold}
                                onTouchCancel={cancelHold}
                                className={`group flex gap-2 items-end [@media(pointer:coarse)]:select-none [@media(pointer:coarse)]:[-webkit-touch-callout:none] ${
                                    mine ? "flex-row-reverse" : ""
                                } ${m._id === highlightId ? "bg-[#fff3cd]" : ""}`}
                            >
                                {mine ? (
                                    <Avatar
                                        photo={viewerPhoto}
                                        name={viewerName}
                                        size="h-7 w-7 text-[10px]"
                                    />
                                ) : (
                                    <Link
                                        href={`/${m.author.username}`}
                                        title={`View ${displayNameOrUsername(m.author.displayName, m.author.username)}'s profile`}
                                    >
                                        <Avatar
                                            photo={m.author.photo}
                                            name={displayNameOrUsername(m.author.displayName, m.author.username)}
                                            size="h-7 w-7 text-[10px]"
                                        />
                                    </Link>
                                )}

                                <div
                                    className={`max-w-[78%] px-2.5 py-1.5 border ${
                                        mine
                                            ? "bg-[#cc99cc]/25 border-[#cc99cc] text-right"
                                            : "bg-white border-[#6699cc] text-left"
                                    }`}
                                >
                                    {reply && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                scrollToMessage(reply.messageId)
                                            }
                                            title={`View ${reply.authorDisplayName}'s message`}
                                            className={`block w-full max-w-full border-l-2 bg-black/5 px-1.5 py-0.5 mb-1 text-left ${
                                                mine
                                                    ? "border-[#cc99cc]"
                                                    : "border-[#6699cc]"
                                            }`}
                                        >
                                            <span className="block font-bold text-[11px] text-[#003399] truncate">
                                                {reply.authorId === viewerId
                                                    ? "You"
                                                    : reply.authorDisplayName}
                                            </span>
                                            <span className="block text-[11px] text-gray-500 line-clamp-2 whitespace-pre-wrap break-words">
                                                {reply.body}
                                            </span>
                                        </button>
                                    )}

                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        {mine ? (
                                            <span className="font-bold text-[11px] text-[#8a2b9a]">
                                                You
                                            </span>
                                        ) : (
                                            <Link
                                                href={`/${m.author.username}`}
                                                className="font-bold text-[11px] text-[#003399] no-underline hover:underline"
                                            >
                                                {displayNameOrUsername(m.author.displayName, m.author.username)}
                                            </Link>
                                        )}

                                        <span
                                            className="text-gray-400 text-[10px]"
                                            title={timeAgo(m.createdAt)}
                                        >
                                            {formatTime(m.createdAt)}
                                        </span>
                                    </div>

                                    <p className="whitespace-pre-wrap text-[13px] mt-0.5 break-words">
                                        {m.body}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => startReply(m)}
                                    aria-label={`Reply to ${displayNameOrUsername(m.author.displayName, m.author.username)}`}
                                    title="Reply"
                                    className={`self-center w-7 h-7 shrink-0 flex items-center justify-center text-[15px] border border-[#6699cc] bg-white hover:bg-[#dbe9f7] transition-opacity hover:cursor-pointer ${
                                        pressedId === m._id
                                            ? "opacity-100"
                                            : "opacity-0 group-hover:opacity-100"
                                    }`}
                                >
                                    ↩️
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Replying-to banner */}
            {replyingTo && (
                <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 border border-[#6699cc] bg-[#dbe9f7]">
                    <span className="font-bold  text-[#003399] shrink-0">
                        ↩️ Replying to{" "}
                        {replyingTo.author._id === viewerId
                            ? "yourself"
                            : displayNameOrUsername(replyingTo.author.displayName, replyingTo.author.username)}
                    </span>
                    <span className=" text-gray-600 truncate min-w-0 flex-1">
                        “{snippet(replyingTo.body, 80)}”
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setReplyingTo(null);
                            inputRef.current?.focus();
                        }}
                        aria-label="Cancel reply"
                        className="shrink-0 w-5 h-5 flex items-center justify-center text-[11px] text-[#2c4d80] hover:bg-[#c9ddf0]"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Composer */}
            <form
                onSubmit={send}
                className="mt-2 flex gap-2 items-stretch"
                aria-label={`Send message to ${chatboxName}`}
            >
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send(e);
                        }
                    }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                    rows={2}
                    className="input flex-1 resize-none"
                    required
                />

                <button type="submit" disabled={sending} className="btn">
                    {sending ? "..." : "Send ➤"}
                </button>
            </form>

            {error && (
                <div className="text-red-600 text-[11px] mt-1">{error}</div>
            )}
        </div>
    );
}
