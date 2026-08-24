"use client";

import { useState } from "react";
import Link from "next/link";
import {
    deleteBulletinPostAction,
    deleteBulletinCommentAction,
    reactToBulletinPostAction,
} from "@/app/actions";
import {
    REACTION_TYPES,
    type BulletinCommentCard,
    type BulletinPostCard,
    type SerializedBulletinComment,
} from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import ActionButton from "./ActionButton";
import BulletinCommentForm from "./BulletinCommentForm";
import BulletinEditForm from "./BulletinEditForm";
import UserAvatar from "./UserAvatar";
import LinkedText from "./LinkedText";

const visibilityLabels = {
    public: "public",
    friends: "friends",
    private: "only me",
} as const;

export default function BulletinPostCard({
    post,
    currentUserId,
    currentUsername,
    onPostDeleted,
}: {
    post: BulletinPostCard;
    currentUserId?: string;
    currentUsername?: string;
    onPostDeleted?: (postId: string) => void;
}) {
    const isOwnPost = currentUserId === post.author._id;
    const canModerate = isOwnPost || currentUsername === "genggengpro";
    const [open, setOpen] = useState(false);
    const [myReaction, setMyReaction] = useState<string | null>(
        post.myReaction,
    );
    const [reactions, setReactions] = useState(post.reactions);
    const [reacting, setReacting] = useState(false);
    const [comments, setComments] = useState<BulletinCommentCard[]>(
        post.comments,
    );
    const [postBody, setPostBody] = useState(post.body);
    const [postVisibility, setPostVisibility] = useState(post.visibility);
    const [editingPost, setEditingPost] = useState(false);
    const [postMenuOpen, setPostMenuOpen] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

    const countOf = (type: string) =>
        reactions.find((r) => r.type === type)?.count ?? 0;
    const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

    const react = async (type: string) => {
        setOpen(false);
        setReacting(true);
        try {
            const res = await reactToBulletinPostAction(post._id, type);
            if (res && !("error" in res && res.error) && res.reactions) {
                setReactions(res.reactions);
                setMyReaction(res.myReaction ?? null);
            }
        } finally {
            setReacting(false);
        }
    };

    return (
        <article className="bulletin-post border-b border-dotted border-[#99bbdd] py-2 last:border-0">
            <div className="flex gap-2">
                <Link
                    href={`/${post.author.username}`}
                    className="shrink-0 block"
                >
                    <UserAvatar
                        src={post.author.photo}
                        alt={post.author.displayName}
                        className="w-[44px] h-[44px] object-cover"
                    />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-2">
                        <div className="flex flex-col items-start">
                            <Link
                                href={`/${post.author.username}`}
                                className="text-[#003399] font-bold no-underline"
                            >
                                {post.author.displayName}
                            </Link>
                            <Link
                                href={`/bulletin/${post._id}`}
                                className="text-gray-500 text-[11px] no-underline"
                            >
                                {timeAgo(post.createdAt)} ·{" "}
                                {visibilityLabels[postVisibility]}
                            </Link>
                        </div>
                        {isOwnPost && (
                            <div className="relative inline-block">
                                <button
                                    type="button"
                                    className="border-0 bg-transparent text-[#003399] text-[16px] leading-none px-1 py-0 cursor-pointer hover:bg-[#dbe9f7]"
                                    onClick={() => setPostMenuOpen((open) => !open)}
                                    aria-label="Open post actions"
                                    aria-expanded={postMenuOpen}
                                    title="Post actions"
                                >
                                    ⋯
                                </button>
                                {postMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setPostMenuOpen(false)}
                                        />
                                        <div className="absolute z-20 right-0 top-full mt-1 min-w-[110px] border border-[#6699cc] bg-white p-1 shadow-lg">
                                            <button
                                                type="button"
                                                className="block w-full px-2 py-1 text-left text-[11px] text-[#003399] hover:bg-[#dbe9f7]"
                                                onClick={() => {
                                                    setPostMenuOpen(false);
                                                    setEditingPost(true);
                                                }}
                                            >
                                                Edit post
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {editingPost ? (
                        <BulletinEditForm
                            mode="post"
                            itemId={post._id}
                            initialBody={postBody}
                            initialVisibility={postVisibility}
                            onCancel={() => setEditingPost(false)}
                            onSaved={(body, visibility) => {
                                setPostBody(body);
                                if (visibility) setPostVisibility(visibility);
                                setEditingPost(false);
                            }}
                        />
                    ) : (
                        <div className="block text-inherit">
                            <p className="whitespace-pre-wrap text-[12px] mt-1 mb-0">
                                <LinkedText text={postBody} />
                            </p>
                        </div>
                    )}
                    {post.photo && (
                        <Link
                            href={`/bulletin/${post._id}`}
                            className="block mt-1.5"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={post.photo}
                                alt="Post photo"
                                className="w-full"
                            />
                        </Link>
                    )}
                    <div className="relative inline-block mt-1.5">
                        <button
                            type="button"
                            className={`btn text-[11px] px-2 py-0.5 ${myReaction ? "" : "btn-ghost"}`}
                            style={
                                myReaction
                                    ? {
                                          background: "#ffde00",
                                          borderColor: "#b8860b",
                                          color: "#5c3d00",
                                      }
                                    : undefined
                            }
                            onClick={() => setOpen((o) => !o)}
                            disabled={reacting}
                            title={
                                myReaction
                                    ? "Change or remove your reaction"
                                    : "React to this post"
                            }
                        >
                            {myReaction
                                ? `${myReaction} ${countOf(myReaction)}`
                                : "React"}
                        </button>
                        {totalReactions > 0 && !open && (
                            <span className="ml-1.5 text-[11px] text-gray-500 align-middle">
                                {reactions
                                    .slice(0, 3)
                                    .map((r) => `${r.type} ${r.count}`)
                                    .join(" · ")}
                            </span>
                        )}
                        {open && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpen(false)}
                                />
                                <div className="absolute z-20 bottom-full mb-1.5 left-0 bg-white border border-[#6699cc] p-1.5 flex gap-1 shadow-lg">
                                    {REACTION_TYPES.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`text-[18px] leading-none px-1 py-0.5 border cursor-pointer hover:bg-[#dbe9f7] ${
                                                myReaction === t
                                                    ? "border-[#6699cc] bg-[#dbe9f7]"
                                                    : "border-transparent"
                                            }`}
                                            onClick={() => react(t)}
                                            disabled={reacting}
                                            title={`${t}${countOf(t) > 0 ? ` (${countOf(t)})` : ""}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {canModerate && (
                        <div className="mt-1 flex flex-wrap items-start gap-1">
                            <ActionButton
                                action={deleteBulletinPostAction.bind(
                                    null,
                                    post._id,
                                )}
                                className="btn btn-danger text-[11px] px-2 py-0.5"
                                confirmText="Delete this bulletin post?"
                                onSuccess={() => onPostDeleted?.(post._id)}
                            >
                                Delete
                            </ActionButton>
                        </div>
                    )}
                    {comments.length > 0 && (
                        <div className="mt-1.5">
                            {comments.map((comment) => {
                                const isOwnComment =
                                    currentUserId === comment.author._id;
                                const canDelete =
                                    isOwnComment ||
                                    isOwnPost ||
                                    currentUsername === "genggengpro";
                                return (
                                    <div
                                        key={comment._id}
                                        className="text-[12px] leading-snug bg-[#DBE9F7] border-b border-[#fff] p-2"
                                    >
                                        <Link
                                            href={`/${comment.author.username}`}
                                            className="text-[#003399] font-bold no-underline"
                                        >
                                            {comment.author.displayName}
                                        </Link>{" "}
                                        <span className="text-gray-500">
                                            ({timeAgo(comment.createdAt)})
                                        </span>
                                        {editingCommentId === comment._id ? (
                                            <BulletinEditForm
                                                mode="comment"
                                                itemId={comment._id}
                                                initialBody={comment.body}
                                                onCancel={() => setEditingCommentId(null)}
                                                onSaved={(body) => {
                                                    setComments((prev) =>
                                                        prev.map((item) =>
                                                            item._id === comment._id
                                                                ? { ...item, body }
                                                                : item,
                                                        ),
                                                    );
                                                    setEditingCommentId(null);
                                                }}
                                            />
                                        ) : (
                                            <>
                                                {" "}
                                                <span className="whitespace-pre-wrap">
                                                    <LinkedText text={comment.body} />
                                                </span>
                                            </>
                                        )}
                                        {editingCommentId !== comment._id && (isOwnComment || canDelete) && (
                                            <span className="ml-1 inline-flex gap-1">
                                                {isOwnComment && (
                                                    <button
                                                        type="button"
                                                        className="text-[#003399] underline text-[11px] p-0 border-0 bg-transparent cursor-pointer"
                                                        onClick={() => setEditingCommentId(comment._id)}
                                                        aria-label="Edit your comment"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <ActionButton
                                                        action={deleteBulletinCommentAction.bind(
                                                            null,
                                                            comment._id,
                                                        )}
                                                        className="text-[#cc0000] underline text-[11px] p-0 border-0 bg-transparent"
                                                        confirmText="Delete this comment?"
                                                        onSuccess={() =>
                                                            setComments((prev) =>
                                                                prev.filter(
                                                                    (c) => c._id !== comment._id,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </ActionButton>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {currentUserId && (
                        <BulletinCommentForm
                            postId={post._id}
                            onPosted={(comment: SerializedBulletinComment) =>
                                setComments((prev) => [...prev, comment])
                            }
                        />
                    )}
                </div>
            </div>
        </article>
    );
}
