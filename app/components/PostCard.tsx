"use client";

import { useState } from "react";
import Link from "next/link";
import {
    REACTION_TYPES,
    type BulletinCommentCard,
    type BulletinPostCard,
} from "@/lib/types";
import {
    reactToBulletinPostAction,
    reactToGroupPostAction,
    createGroupCommentAction,
    deleteBulletinPostAction,
    deleteBulletinCommentAction,
    deleteGroupPostAction,
    deleteGroupCommentAction,
} from "@/app/actions";
import type { SerializedBulletinComment } from "@/lib/types";
import ActionButton from "./ActionButton";
import BulletinEditForm from "./BulletinEditForm";
import GroupEditForm from "./GroupEditForm";
import { timeAgo } from "@/lib/utils";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";
import UserAvatar from "./UserAvatar";
import BulletinCommentForm from "./BulletinCommentForm";
import LinkedText from "./LinkedText";

type Post = BulletinPostCard & { groupId?: string };

export default function PostCard({
    post,
    groupId,
    currentUserId,
    currentUsername,
    onPostDeleted,
    canInteract = true,
    hideComments = false,
}: {
    post: Post;
    groupId?: string;
    currentUserId?: string;
    currentUsername?: string;
    onPostDeleted?: (postId: string) => void;
    canInteract?: boolean;
    hideComments?: boolean;
}) {
    const [reactions, setReactions] = useState(post.reactions);
    const [myReaction, setMyReaction] = useState(post.myReaction);
    const [comments, setComments] = useState<BulletinCommentCard[]>(
        post.comments,
    );
    const [postBody, setPostBody] = useState(post.body);
    const [postVisibility, setPostVisibility] = useState(post.visibility);
    const [editingPost, setEditingPost] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(
        null,
    );
    const [menuOpen, setMenuOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [commentBody, setCommentBody] = useState("");
    const [commentPending, setCommentPending] = useState(false);
    const isGroup = Boolean(groupId);
    const isOwn = currentUserId === post.author._id;
    const countOf = (type: string) =>
        reactions.find((reaction) => reaction.type === type)?.count ?? 0;
    const canManage = isOwn || currentUsername === "genggengpro";
    const react = async (type: string) => {
        const result = isGroup
            ? await reactToGroupPostAction(groupId!, post._id, type)
            : await reactToBulletinPostAction(post._id, type);
        if (result.ok) {
            const reactionResult = result as {
                reactions?: typeof reactions;
                myReaction?: string | null;
            };
            if (reactionResult.reactions)
                setReactions(reactionResult.reactions);
            setMyReaction(
                reactionResult.myReaction ??
                    (myReaction === type ? null : type),
            );
        }
        setOpen(false);
    };
    return (
        <article className="border-b border-dotted border-[#99bbdd] py-2 last:border-0">
            <div className="flex gap-2">
                <Link
                    href={`/${post.author.username}`}
                    className="shrink-0 self-start"
                >
                    <UserAvatar
                        src={post.author.photo}
                        alt={post.author.displayName}
                        className="block w-[44px] h-[44px] object-cover"
                    />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <Link
                                href={`/${post.author.username}`}
                                className="block text-[#003399] font-bold no-underline"
                            >
                                {post.author.displayName}
                            </Link>
                            {isGroup ? (
                                <span className="block text-gray-500 text-[11px]">
                                    {timeAgo(post.createdAt)}
                                </span>
                            ) : (
                                <Link
                                    href={`/bulletin/${post._id}`}
                                    className="block text-gray-500 text-[11px] no-underline"
                                >
                                    {timeAgo(post.createdAt)} ·{" "}
                                    {post.visibility}
                                </Link>
                            )}
                        </div>
                        {canManage && (
                            <div className="relative">
                                <button
                                    type="button"
                                    className="text-[#003399] text-[16px] leading-none px-1"
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    aria-label="Post actions"
                                    aria-expanded={menuOpen}
                                >
                                    ⋯
                                </button>
                                {menuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setMenuOpen(false)}
                                            aria-hidden="true"
                                        />
                                        <div className="absolute right-0 z-20 border border-[#6699cc] bg-white p-1 min-w-[100px]">
                                            <button
                                                type="button"
                                                className="block w-full text-left text-[11px] px-2 py-1 text-[#003399]"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    setEditingPost(true);
                                                }}
                                            >
                                                Edit post
                                            </button>
                                            <ActionButton
                                                action={
                                                    isGroup
                                                        ? deleteGroupPostAction.bind(
                                                              null,
                                                              groupId!,
                                                              post._id,
                                                          )
                                                        : deleteBulletinPostAction.bind(
                                                              null,
                                                              post._id,
                                                          )
                                                }
                                                className="block w-full text-left text-[11px] px-2 py-1 text-[#cc0000]"
                                                confirmText="Delete this post?"
                                                onSuccess={() =>
                                                    onPostDeleted?.(post._id)
                                                }
                                            >
                                                Delete post
                                            </ActionButton>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        {editingPost ? (
                            isGroup ? (
                                <GroupEditForm
                                    groupId={groupId!}
                                    postId={post._id}
                                    initialBody={postBody}
                                    onCancel={() => setEditingPost(false)}
                                    onSaved={(body) => {
                                        setPostBody(body);
                                        setEditingPost(false);
                                    }}
                                />
                            ) : (
                                <BulletinEditForm
                                    mode="post"
                                    itemId={post._id}
                                    initialBody={postBody}
                                    initialVisibility={postVisibility}
                                    onCancel={() => setEditingPost(false)}
                                    onSaved={(body, visibility) => {
                                        setPostBody(body);
                                        if (visibility)
                                            setPostVisibility(visibility);
                                        setEditingPost(false);
                                    }}
                                />
                            )
                        ) : (
                            post.body && (
                                <p className="whitespace-pre-wrap text-[16px] sm: mt-1 mb-0 break-words">
                                    {isGroup ? (
                                        postBody
                                    ) : (
                                        <LinkedText text={postBody} />
                                    )}
                                </p>
                            )
                        )}
                    </div>
                    {post.photo && (
                        <Link
                            href={`/bulletin/${post._id}`}
                            className="block mt-1.5"
                        >
                            <img
                                src={optimizeCloudinaryUrl(post.photo, {
                                    width: 1200,
                                })}
                                alt="Post photo"
                                className="w-full"
                                loading="lazy"
                                decoding="async"
                            />
                        </Link>
                    )}
                    {(!isGroup || canInteract) && (
                        <div className="relative inline-block mt-1.5">
                            <button
                                type="button"
                                className={`btn text-[11px] px-2 py-0.5 ${myReaction ? "" : "btn-ghost"}`}
                                onClick={() => setOpen(!open)}
                            >
                                {myReaction
                                    ? `${myReaction} ${countOf(myReaction)}`
                                    : "React"}
                            </button>
                            {open && (
                                <div className="absolute z-20 bottom-full mb-1 bg-white border border-[#6699cc] p-1.5 flex gap-1">
                                    {REACTION_TYPES.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className="text-lg"
                                            onClick={() => react(type)}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            )}{" "}
                            {reactions.length > 0 && (
                                <span className="ml-1.5 text-[11px] text-gray-500">
                                    {reactions
                                        .slice(0, 3)
                                        .map(
                                            (reaction) =>
                                                `${reaction.type} ${reaction.count}`,
                                        )
                                        .join(" · ")}
                                </span>
                            )}
                        </div>
                    )}
                    {!hideComments &&
                        comments.map((comment) => {
                            const ownComment =
                                currentUserId === comment.author._id;
                            return (
                                <div
                                    key={comment._id}
                                    className="bg-[#DBE9F7] p-2 mt-1"
                                >
                                    <Link
                                        href={`/${comment.author.username}`}
                                        className="text-[#003399] font-bold"
                                    >
                                        {comment.author.displayName}
                                    </Link>{" "}
                                    <span className="text-gray-500">
                                        ({timeAgo(comment.createdAt)})
                                    </span>{" "}
                                    {editingCommentId === comment._id ? (
                                        isGroup ? (
                                            <GroupEditForm
                                                groupId={groupId!}
                                                commentId={comment._id}
                                                initialBody={comment.body}
                                                onCancel={() =>
                                                    setEditingCommentId(null)
                                                }
                                                onSaved={(body) => {
                                                    setComments((items) =>
                                                        items.map((item) =>
                                                            item._id ===
                                                            comment._id
                                                                ? {
                                                                      ...item,
                                                                      body,
                                                                  }
                                                                : item,
                                                        ),
                                                    );
                                                    setEditingCommentId(null);
                                                }}
                                            />
                                        ) : (
                                            <BulletinEditForm
                                                mode="comment"
                                                itemId={comment._id}
                                                initialBody={comment.body}
                                                onCancel={() =>
                                                    setEditingCommentId(null)
                                                }
                                                onSaved={(body) => {
                                                    setComments((items) =>
                                                        items.map((item) =>
                                                            item._id ===
                                                            comment._id
                                                                ? {
                                                                      ...item,
                                                                      body,
                                                                  }
                                                                : item,
                                                        ),
                                                    );
                                                    setEditingCommentId(null);
                                                }}
                                            />
                                        )
                                    ) : (
                                        <>
                                            <span>
                                                {" "}
                                                {isGroup ? (
                                                    comment.body
                                                ) : (
                                                    <LinkedText
                                                        text={comment.body}
                                                    />
                                                )}
                                            </span>
                                            {(ownComment || isOwn) && (
                                                <span className="ml-1 inline-flex gap-1">
                                                    {ownComment && (
                                                        <button
                                                            type="button"
                                                            className="text-[#003399] underline text-[11px] cursor-pointer"
                                                            onClick={() =>
                                                                setEditingCommentId(
                                                                    comment._id,
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                    <ActionButton
                                                        action={
                                                            (isGroup
                                                                ? deleteGroupCommentAction.bind(
                                                                      null,
                                                                      groupId!,
                                                                      comment._id,
                                                                  )
                                                                : deleteBulletinCommentAction.bind(
                                                                      null,
                                                                      comment._id,
                                                                  )) as any
                                                        }
                                                        className="text-[#cc0000] underline text-[11px] cursor-pointer"
                                                        confirmText="Delete this comment?"
                                                        hideError={isGroup}
                                                        onSuccess={() =>
                                                            setComments(
                                                                (items) =>
                                                                    items.filter(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            item._id !==
                                                                            comment._id,
                                                                    ),
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </ActionButton>
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    {!hideComments &&
                        (isGroup && canInteract ? (
                            <form
                                action={async (formData) => {
                                    const body = String(
                                        formData.get("body") || "",
                                    ).trim();
                                    if (!body) return;
                                    setCommentPending(true);
                                    const result =
                                        await createGroupCommentAction(
                                            groupId!,
                                            post._id,
                                            formData,
                                        );
                                    setCommentPending(false);
                                    if (result.ok) {
                                        setCommentBody("");
                                        setComments((items) => [
                                            ...items,
                                            {
                                                _id: crypto.randomUUID(),
                                                postId: post._id,
                                                authorId: currentUserId!,
                                                body,
                                                createdAt:
                                                    new Date().toISOString(),
                                                author: {
                                                    _id: currentUserId!,
                                                    username: "",
                                                    displayName: "You",
                                                    photo: null,
                                                },
                                            },
                                        ]);
                                    }
                                }}
                                className="flex gap-1 mt-1.5"
                            >
                                <input
                                    name="body"
                                    value={commentBody}
                                    onChange={(e) =>
                                        setCommentBody(e.target.value)
                                    }
                                    className="input flex-1 text-[11px]"
                                    placeholder="Write a comment..."
                                    required
                                    disabled={commentPending}
                                />
                                <button
                                    className="btn text-[11px]"
                                    disabled={commentPending}
                                >
                                    {commentPending ? "Posting…" : "Comment"}
                                </button>
                            </form>
                        ) : (
                            currentUserId && (
                                <BulletinCommentForm
                                    postId={post._id}
                                    onPosted={(
                                        comment: SerializedBulletinComment,
                                    ) =>
                                        setComments((items) => [
                                            ...items,
                                            comment,
                                        ])
                                    }
                                />
                            )
                        ))}
                </div>
            </div>
        </article>
    );
}
