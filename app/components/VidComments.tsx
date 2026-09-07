"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
    createVidCommentAction,
    deleteVidCommentAction,
    getMoreVidCommentsAction,
} from "@/app/actions";
import type { SerializedVidComment } from "@/lib/types";
import { displayNameOrUsername, timeAgo } from "@/lib/utils";
import ActionButton from "./ActionButton";
import UserAvatar from "./UserAvatar";

// Bottom-sheet comment viewer with cursor pagination (newest first). Only a
// page of comments loads at a time; older ones load as the list is scrolled.
export default function VidComments({
    vidId,
    isLoggedIn,
    currentUserId,
    canModerate,
    onCountChange,
    onClose,
}: {
    vidId: string;
    isLoggedIn: boolean;
    currentUserId?: string;
    // True for the vid owner / admins, who may delete any comment.
    canModerate?: boolean;
    onCountChange: (delta: number) => void;
    onClose: () => void;
}) {
    const [comments, setComments] = useState<SerializedVidComment[]>([]);
    const [more, setMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");
    const [body, setBody] = useState("");
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState("");
    const cursorRef = useRef<{ createdAt: string; _id: string } | null>(null);
    const loadingMoreRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const loadFirstPage = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getMoreVidCommentsAction(vidId, null);
            setComments(res.comments);
            cursorRef.current = res.nextCursor;
            setMore(res.nextCursor !== null);
        } catch {
            setError("Could not load comments.");
        } finally {
            setLoading(false);
        }
    }, [vidId]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || !cursorRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const res = await getMoreVidCommentsAction(vidId, cursorRef.current);
            cursorRef.current = res.nextCursor;
            setMore(res.nextCursor !== null);
            setComments((prev) => [...prev, ...res.comments]);
        } catch {
            // Keep the button state simple: stop auto-loading on error.
            setMore(false);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [vidId]);

    // Defer the initial fetch out of the effect body so the loading state is
    // applied after the sheet mounts.
    useEffect(() => {
        const timer = window.setTimeout(loadFirstPage, 0);
        return () => window.clearTimeout(timer);
    }, [loadFirstPage]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: "200px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);

    const postComment = async (formData: FormData) => {
        if (posting) return;
        const text = String(formData.get("body") || "").trim();
        if (!text) return;
        setPosting(true);
        setPostError("");
        try {
            const res = await createVidCommentAction(vidId, formData);
            if (res.error) {
                setPostError(res.error);
                return;
            }
            if (res.comment) {
                setComments((prev) => [res.comment!, ...prev]);
                onCountChange(1);
                setBody("");
            }
        } catch {
            setPostError("Something went wrong while commenting. Please try again.");
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Comments">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[70dvh] w-full max-w-[640px] flex-col border border-b-0 border-[#6699cc] bg-white">
                <div className="flex items-center justify-between border-b border-[#99bbdd] bg-[#2c4d80] px-3 py-2">
                    <span className="font-bold text-white text-[13px]">
                        Comments ({comments.length})
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer border-0 bg-transparent p-1 text-white hover:text-[#dbe9f7]"
                        aria-label="Close comments"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                    {loading ? (
                        <p className="text-gray-500 text-[12px]">Loading comments...</p>
                    ) : error ? (
                        <p className="text-red-600 text-[12px]">{error}</p>
                    ) : comments.length === 0 ? (
                        <p className="text-gray-500 italic text-[12px]">
                            No comments yet. Be the first!
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {comments.map((comment) => {
                                const own = currentUserId === comment.author._id;
                                return (
                                    <div key={comment._id} className="flex gap-2">
                                        <Link href={`/${comment.author.username}`} className="shrink-0 self-start">
                                            <UserAvatar
                                                src={comment.author.photo}
                                                alt={displayNameOrUsername(comment.author.displayName, comment.author.username)}
                                                className="block h-8 w-8 object-cover"
                                                cloudinaryWidth={64}
                                            />
                                        </Link>
                                        <div className="min-w-0 flex-1 bg-[#dbe9f7] px-2 py-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/${comment.author.username}`}
                                                        className="text-[#003399] font-bold text-[12px] no-underline"
                                                    >
                                                        {displayNameOrUsername(comment.author.displayName, comment.author.username)}
                                                    </Link>{" "}
                                                    <span className="text-gray-500 text-[11px]">
                                                        {timeAgo(comment.createdAt)}
                                                    </span>
                                                </div>
                                                {(own || canModerate) && (
                                                    <ActionButton
                                                        action={() => deleteVidCommentAction(comment._id)}
                                                        className="text-[#cc0000] underline text-[11px] cursor-pointer"
                                                        confirmText="Delete this comment?"
                                                        onSuccess={() => {
                                                            setComments((prev) => prev.filter((c) => c._id !== comment._id));
                                                            onCountChange(-1);
                                                        }}
                                                    >
                                                        Delete
                                                    </ActionButton>
                                                )}
                                            </div>
                                            <p className="whitespace-pre-wrap break-words text-[13px] text-black">
                                                {comment.body}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {more && (
                                <div
                                    ref={sentinelRef}
                                    className="py-1 text-center text-[11px] text-gray-400"
                                >
                                    {loadingMore ? "Loading more..." : ""}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isLoggedIn ? (
                    <form
                        action={postComment}
                        className="flex gap-1.5 border-t border-[#99bbdd] p-2.5"
                    >
                        <input
                            name="body"
                            value={body}
                            onChange={(event) => {
                                setBody(event.target.value);
                                setPostError("");
                            }}
                            className="input flex-1 text-[13px]"
                            placeholder="Add a comment..."
                            maxLength={500}
                            disabled={posting}
                            aria-label="Comment text"
                        />
                        <button type="submit" className="btn shrink-0" disabled={posting || !body.trim()}>
                            {posting ? "Posting..." : "Comment"}
                        </button>
                    </form>
                ) : (
                    <div className="border-t border-[#99bbdd] p-2.5 text-center text-[12px] text-gray-500">
                        <Link href="/login" className="text-[#003399] font-bold">
                            Log in
                        </Link>{" "}
                        to join the conversation.
                    </div>
                )}
                {postError && (
                    <p role="alert" className="px-2.5 pb-1 text-[11px] text-red-600">
                        {postError}
                    </p>
                )}
            </div>
        </div>
    );
}