"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import {
    reactToVidAction,
    sendFriendRequestAction,
    acceptFriendRequestFromAction,
    deleteVidAction,
    reportVidAction,
} from "@/app/actions";
import {
    VID_REPORT_CATEGORIES,
    type BulletinReactionSummary,
    type SerializedVid,
} from "@/lib/types";
import { displayNameOrUsername, formatCount, timeAgo } from "@/lib/utils";
import ActionButton from "./ActionButton";
import ReactionPicker from "./ReactionPicker";
import UserAvatar from "./UserAvatar";
import VidComments from "./VidComments";
import VidShareButton from "./VidShareButton";

const HASHTAG_PATTERN = /(#[a-zA-Z0-9_]+)/g;

function CaptionText({ caption }: { caption: string }) {
    if (!caption) return null;
    const parts = caption.split(HASHTAG_PATTERN);
    return (
        <p className="text-[13px] leading-snug text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-[350px]">
            {parts.map((part, index) =>
                /^#[a-zA-Z0-9_]+$/.test(part) ? (
                    <span key={index} className="font-bold text-[#dbe9f7]">
                        {part}
                    </span>
                ) : (
                    <span key={index}>{part}</span>
                ),
            )}
        </p>
    );
}

// Overlay content shown on top of a Vid: creator, follow, caption, hashtags,
// view count, and the action rail (like / comment / share / more).
export default function VidCard({
    vid,
    isLoggedIn,
    currentUserId,
    onDeleted,
}: {
    vid: SerializedVid;
    isLoggedIn: boolean;
    currentUserId?: string;
    onDeleted?: (vidId: string) => void;
}) {
    const [reactions, setReactions] = useState<BulletinReactionSummary[]>(
        vid.reactions ?? [],
    );
    const [myReaction, setMyReaction] = useState<string | null>(
        vid.myReaction ?? null,
    );
    const [likeCount, setLikeCount] = useState(vid.likeCount);
    const [commentCount, setCommentCount] = useState(vid.commentCount);
    const [friendshipStatus, setFriendshipStatus] = useState(
        vid.friendshipStatus,
    );
    const [menuOpen, setMenuOpen] = useState(false);
    const [reactOpen, setReactOpen] = useState(false);
    const [reacting, setReacting] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);

    const isOwner = currentUserId === vid.userId;
    const canModerate = isOwner || currentUserId === "genggengpro";
    const countOf = (type: string) =>
        reactions.find((reaction) => reaction.type === type)?.count ?? 0;

    const react = async (type: string) => {
        if (!isLoggedIn || reacting) return;
        setReactOpen(false);
        setReacting(true);
        const previous = { reactions, myReaction, likeCount };
        try {
            const res = await reactToVidAction(vid._id, type);
            if (res.error || !res.ok) {
                setReactions(previous.reactions);
                setMyReaction(previous.myReaction);
                setLikeCount(previous.likeCount);
                return;
            }
            if (res.reactions) setReactions(res.reactions);
            setMyReaction(res.myReaction ?? null);
            if (typeof res.likeCount === "number") setLikeCount(res.likeCount);
        } catch {
            setReactions(previous.reactions);
            setMyReaction(previous.myReaction);
            setLikeCount(previous.likeCount);
        } finally {
            setReacting(false);
        }
    };

    const follow = async () => {
        if (!isLoggedIn || followBusy) return;
        setFollowBusy(true);
        try {
            if (friendshipStatus === "none") {
                const res = await sendFriendRequestAction(vid.userId);
                if (!res.error) setFriendshipStatus("pending_out");
            } else if (friendshipStatus === "pending_in") {
                const res = await acceptFriendRequestFromAction(vid.userId);
                if (!res.error) setFriendshipStatus("friends");
            }
        } finally {
            setFollowBusy(false);
        }
    };

    const followLabel =
        friendshipStatus === "none"
            ? "+ Follow"
            : friendshipStatus === "pending_out"
              ? "Pending"
              : friendshipStatus === "pending_in"
                ? "Accept"
                : friendshipStatus === "friends"
                  ? "Friends"
                  : "";

    const showFollow =
        isLoggedIn &&
        !isOwner &&
        (friendshipStatus === "none" ||
            friendshipStatus === "pending_out" ||
            friendshipStatus === "pending_in");

    return (
        <>
            <div className="pointer-events-none absolute inset-0 z-10">
                {/* Action rail */}
                <div className="pointer-events-auto absolute bottom-24 right-2 z-20 flex flex-col items-center gap-4 sm:right-3 sm:bottom-28">
                    <div className="relative flex flex-col items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => setReactOpen((open) => !open)}
                            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 text-white transition-transform hover:scale-105 ${
                                myReaction
                                    ? "bg-[#cc3399]"
                                    : "bg-black/40 hover:bg-black/60"
                            }`}
                            aria-label={
                                myReaction
                                    ? `Change or remove reaction, ${myReaction}`
                                    : "React to this Vid"
                            }
                            aria-haspopup="true"
                            aria-expanded={reactOpen}
                            title={
                                reactions.length > 0
                                    ? reactions
                                          .map((r) => `${r.type} ${r.count}`)
                                          .join(" · ")
                                    : "React"
                            }
                            disabled={!isLoggedIn || reacting}
                        >
                            {myReaction ? (
                                <span
                                    className="text-[22px] leading-none"
                                    aria-hidden="true"
                                >
                                    {myReaction}
                                </span>
                            ) : (
                                <Heart size={22} aria-hidden="true" />
                            )}
                        </button>
                        <span className="text-[12px] font-bold text-white drop-shadow">
                            {formatCount(likeCount)}
                        </span>
                        {reactOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setReactOpen(false)}
                                    aria-hidden="true"
                                />
                                <ReactionPicker
                                    myReaction={myReaction}
                                    reacting={reacting}
                                    countOf={countOf}
                                    onReact={react}
                                    align="right"
                                />
                            </>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => setCommentsOpen(true)}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-black/40 text-white hover:bg-black/60"
                            aria-label={`Comments (${commentCount})`}
                            title="Comments"
                        >
                            <MessageCircle size={22} aria-hidden="true" />
                        </button>
                        <span className="text-[12px] font-bold text-white drop-shadow">
                            {formatCount(commentCount)}
                        </span>
                    </div>

                    <VidShareButton
                        vidId={vid._id}
                        title={
                            vid.caption ||
                            `${displayNameOrUsername(vid.author.displayName, vid.author.username)}'s Vid`
                        }
                        isLoggedIn={isLoggedIn}
                        className="h-11 w-11 rounded-full border-0 bg-black/40 p-0 text-white hover:bg-black/60"
                    />

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setMenuOpen((open) => !open)}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-black/40 text-white hover:bg-black/60"
                            aria-label="More options"
                            aria-expanded={menuOpen}
                            title="More options"
                        >
                            <MoreHorizontal size={22} aria-hidden="true" />
                        </button>
                        {menuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setMenuOpen(false)}
                                    aria-hidden="true"
                                />
                                <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] border border-[#6699cc] bg-white p-1 shadow-md">
                                    {canModerate ? (
                                        <ActionButton
                                            action={() =>
                                                deleteVidAction(vid._id)
                                            }
                                            className="block w-full cursor-pointer px-2 py-1 text-left text-[12px] text-[#cc0000]"
                                            confirmText="Delete this Vid? This can't be undone."
                                            onSuccess={() => {
                                                setMenuOpen(false);
                                                onDeleted?.(vid._id);
                                            }}
                                        >
                                            Delete Vid
                                        </ActionButton>
                                    ) : (
                                        <button
                                            type="button"
                                            className="block w-full cursor-pointer px-2 py-1 text-left text-[12px] text-[#003399]"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setReportOpen(true);
                                            }}
                                        >
                                            Report
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Bottom info */}
                <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-8 pt-12 sm:px-4 sm:pb-10">
                    <div className="mb-2 flex items-center gap-2">
                        <Link
                            href={`/${vid.author.username}`}
                            className="shrink-0"
                        >
                            <UserAvatar
                                src={vid.author.photo}
                                alt={displayNameOrUsername(
                                    vid.author.displayName,
                                    vid.author.username,
                                )}
                                className="block h-9 w-9 rounded-full border border-white/60 object-cover"
                                cloudinaryWidth={72}
                            />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                            <Link
                                href={`/${vid.author.username}`}
                                className="truncate text-[13px] font-bold text-white no-underline drop-shadow"
                            >
                                {displayNameOrUsername(
                                    vid.author.displayName,
                                    vid.author.username,
                                )}
                            </Link>
                            <span className="text-[11px] text-white/70 drop-shadow">
                                {formatCount(vid.viewCount)} views ·{" "}
                                {timeAgo(vid.createdAt)}
                            </span>
                        </div>
                        {showFollow && (
                            <button
                                type="button"
                                onClick={follow}
                                disabled={
                                    followBusy ||
                                    friendshipStatus === "pending_out"
                                }
                                className="cursor-pointer border border-white/70 bg-white/15 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur-sm hover:bg-white/30 disabled:cursor-default disabled:opacity-70"
                            >
                                {followLabel}
                            </button>
                        )}
                    </div>
                    <CaptionText caption={vid.caption} />
                </div>
            </div>

            {commentsOpen && (
                <VidComments
                    vidId={vid._id}
                    totalCount={commentCount}
                    isLoggedIn={isLoggedIn}
                    currentUserId={currentUserId}
                    canModerate={canModerate}
                    onCountChange={(delta) =>
                        setCommentCount((count) => Math.max(0, count + delta))
                    }
                    onClose={() => setCommentsOpen(false)}
                />
            )}

            {reportOpen && (
                <VidReportDialog
                    vidId={vid._id}
                    onClose={() => setReportOpen(false)}
                />
            )}
        </>
    );
}

function VidReportDialog({
    vidId,
    onClose,
}: {
    vidId: string;
    onClose: () => void;
}) {
    const [category, setCategory] = useState<string>(VID_REPORT_CATEGORIES[0]);
    const [reason, setReason] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    const submit = async () => {
        setPending(true);
        setError("");
        try {
            const res = await reportVidAction(vidId, category, reason);
            if (res.error) {
                setError(res.error);
                return;
            }
            setDone(true);
        } catch {
            setError("Could not submit the report. Please try again.");
        } finally {
            setPending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3"
            role="dialog"
            aria-modal="true"
            aria-label="Report Vid"
        >
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative w-full max-w-[400px] border border-[#6699cc] bg-white shadow-lg">
                <div className="bg-[#2c4d80] px-3 py-2 text-[13px] font-bold text-white">
                    Report this Vid
                </div>
                <div className="p-3">
                    {done ? (
                        <p className="text-[13px] text-green-700 font-bold">
                            Report submitted. Thanks for keeping Genggi safe!
                        </p>
                    ) : (
                        <>
                            <div className="mb-2 grid grid-cols-2 gap-1">
                                {VID_REPORT_CATEGORIES.map((value) => (
                                    <label
                                        key={value}
                                        className="flex cursor-pointer items-center gap-1.5 text-[12px]"
                                    >
                                        <input
                                            type="radio"
                                            name="category"
                                            value={value}
                                            checked={category === value}
                                            onChange={() => setCategory(value)}
                                        />
                                        <span className="capitalize">
                                            {value}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <textarea
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                                rows={3}
                                maxLength={500}
                                className="input text-[13px]"
                                placeholder="Add details (optional)"
                                aria-label="Report details"
                            />
                            {error && (
                                <p
                                    role="alert"
                                    className="mt-1 text-[11px] text-red-600"
                                >
                                    {error}
                                </p>
                            )}
                            <div className="mt-2 flex justify-end gap-1.5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn btn-ghost"
                                    disabled={pending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={submit}
                                    className="btn btn-danger"
                                    disabled={pending}
                                >
                                    {pending
                                        ? "Submitting..."
                                        : "Submit Report"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
