"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import {
    type BulletinCommentCard,
    type BulletinPostCard,
    type BulletinReactionSummary,
} from "@/lib/types";
import {
    reactToBulletinPostAction,
    reactToGroupPostAction,
    reactToBulletinCommentAction,
    createGroupCommentAction,
    deleteBulletinPostAction,
    deleteBulletinCommentAction,
    deleteGroupPostAction,
    deleteGroupCommentAction,
} from "@/app/actions";
import type {
    BulletinMentionRef,
    MentionFriend,
    SerializedBulletinComment,
} from "@/lib/types";
import ActionButton from "./ActionButton";
import BulletinEditForm from "./BulletinEditForm";
import GroupEditForm from "./GroupEditForm";
import { displayNameOrUsername, timeAgo } from "@/lib/utils";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";
import UserAvatar from "./UserAvatar";
import BulletinCommentForm from "./BulletinCommentForm";
import LinkedText from "./LinkedText";
import ReactionPicker from "./ReactionPicker";
import YouTubeLinkEmbed, {
    findYouTubeVideoId,
    stripYouTubeLinks,
} from "./YouTubeLinkEmbed";
import BulletinVidEmbed from "./BulletinVidEmbed";

// Bulletin and group posts share this shape; a group post carries its groupId,
// which switches the card over to group actions and group links.
type Post = BulletinPostCard;

export default function PostCard({
    post,
    groupId,
    currentUserId,
    currentUsername,
    onPostDeleted,
    canInteract = true,
    hideComments = false,
    showComments = false,
    friends,
    isGroupOwner = false,
}: {
    post: Post;
    groupId?: string;
    currentUserId?: string;
    currentUsername?: string;
    onPostDeleted?: (postId: string) => void;
    canInteract?: boolean;
    hideComments?: boolean;
    showComments?: boolean;
    // Friends of the current user, used to power @mentions in the post/comment
    // composers. Group posts don't pass this (group members aren't friends).
    friends?: MentionFriend[];
    isGroupOwner?: boolean;
}) {
    const [reactions, setReactions] = useState(post.reactions);
    const [myReaction, setMyReaction] = useState(post.myReaction);
    const [comments, setComments] = useState<BulletinCommentCard[]>(
        post.comments,
    );
    const [postBody, setPostBody] = useState(post.body);
    const embeddedVideoId = findYouTubeVideoId(postBody);
    const displayBody = postBody;
    const [postVisibility, setPostVisibility] = useState(post.visibility);
    const [editingPost, setEditingPost] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(
        null,
    );
    const [menuOpen, setMenuOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [openCommentId, setOpenCommentId] = useState<string | null>(null);
    const [reactingCommentId, setReactingCommentId] = useState<string | null>(
        null,
    );
    const isGroup = Boolean(groupId);
    // Group posts get their own page (`/groups/<id>/posts/<postId>`) just like
    // bulletin posts, so the card links there instead of opening the thread
    // in place.
    const postHref = isGroup
        ? `/groups/${groupId}/posts/${post._id}`
        : `/bulletin/${post._id}`;
    const commentsVisible = !hideComments && showComments;
    const isOwn = currentUserId === post.author._id;
    const countOf = (type: string) =>
        reactions.find((reaction) => reaction.type === type)?.count ?? 0;
    // The site-admin bypass only applies to bulletins: group post actions are
    // limited to the author (and the group owner), so offering the menu on a
    // group post here would just fail.
    const canManage =
        isOwn ||
        (!isGroup && currentUsername === "genggengpro") ||
        (isGroup && isGroupOwner);
    const commentCountOf = (comment: BulletinCommentCard, type: string) =>
        (comment.reactions ?? []).find((r) => r.type === type)?.count ?? 0;
    const commentTotalReactions = (comment: BulletinCommentCard) =>
        (comment.reactions ?? []).reduce((sum, r) => sum + r.count, 0);
    const optimisticCommentReaction = (
        comment: BulletinCommentCard,
        type: string,
    ): BulletinCommentCard => {
        const current = comment.reactions ?? [];
        const my = comment.myReaction ?? null;
        let next: BulletinReactionSummary[];
        let nextMy: string | null;
        if (my === type) {
            // Toggle off the user's current reaction.
            next = current
                .map((r) =>
                    r.type === type ? { ...r, count: r.count - 1 } : r,
                )
                .filter((r) => r.count > 0);
            nextMy = null;
        } else {
            // Remove the old reaction (if any) and add the new one.
            next = current.map((r) =>
                r.type === my
                    ? { ...r, count: r.count - 1 }
                    : r.type === type
                      ? { ...r, count: r.count + 1 }
                      : r,
            );
            if (!next.some((r) => r.type === type)) {
                next = [...next, { type, count: 1 }];
            }
            next = next.filter((r) => r.count > 0);
            nextMy = type;
        }
        return { ...comment, reactions: next, myReaction: nextMy };
    };
    const reactToComment = async (commentId: string, type: string) => {
        setOpenCommentId(null);
        setReactingCommentId(commentId);
        const previous = comments.find((c) => c._id === commentId);
        // Optimistic update so the UI reflects the reaction immediately.
        setComments((prev) =>
            prev.map((c) =>
                c._id === commentId ? optimisticCommentReaction(c, type) : c,
            ),
        );
        try {
            const res = await reactToBulletinCommentAction(commentId, type);
            if (res && !("error" in res && res.error) && res.reactions) {
                setComments((prev) =>
                    prev.map((c) =>
                        c._id === commentId
                            ? {
                                  ...c,
                                  reactions: res.reactions ?? [],
                                  myReaction: res.myReaction ?? null,
                              }
                            : c,
                    ),
                );
            } else if (previous) {
                setComments((prev) =>
                    prev.map((c) => (c._id === commentId ? previous : c)),
                );
            }
        } catch {
            if (previous) {
                setComments((prev) =>
                    prev.map((c) => (c._id === commentId ? previous : c)),
                );
            }
        } finally {
            setReactingCommentId(null);
        }
    };
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
        <article className="post-card group-[.bulletin]:border group-[.bulletin]:border-[#99bbdd] mb-1 sm:mb-3 p-3 pb-2 group-[.bulletin]:bg-white">
            <div className="flex gap-2">
                <Link
                    href={`/${post.author.username}`}
                    className="shrink-0 self-start"
                >
                    <UserAvatar
                        src={post.author.photo}
                        alt={displayNameOrUsername(
                            post.author.displayName,
                            post.author.username,
                        )}
                        className="block w-[45px] h-[45px] object-cover"
                        cloudinaryWidth={45}
                    />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <Link
                                href={`/${post.author.username}`}
                                className="block text-[#003399] font-bold no-underline"
                            >
                                {displayNameOrUsername(
                                    post.author.displayName,
                                    post.author.username,
                                )}
                            </Link>
                            {isGroup ? (
                                <div className="block text-gray-500 text-[11px]">
                                    <Link
                                        href={postHref}
                                        className="no-underline"
                                    >
                                        {timeAgo(post.createdAt)}
                                    </Link>
                                    {post.groupName && (
                                        <>
                                            {" · in "}
                                            <Link
                                                href={`/groups/${groupId}`}
                                                className="font-bold text-[#003399] no-underline hover:underline"
                                            >
                                                {post.groupName}
                                            </Link>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href={postHref}
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
                                                onSuccess={() => {
                                                    setMenuOpen(false);
                                                    if (onPostDeleted) {
                                                        onPostDeleted(post._id);
                                                    } else if (showComments && typeof window !== "undefined") {
                                                        window.location.href = isGroup
                                                            ? `/groups/${groupId}`
                                                            : "/";
                                                    }
                                                }}
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
                                    friends={friends}
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
                            post.body &&
                            displayBody.trim() && (
                                <p className="whitespace-pre-wrap text-[16px] mt-1 mb-0 break-words">
                                    <LinkedText
                                        text={displayBody}
                                        mentions={post.mentions}
                                    />
                                </p>
                            )
                        )}
                        {!editingPost && embeddedVideoId && (
                            <YouTubeLinkEmbed videoId={embeddedVideoId} />
                        )}
                    </div>
                    {post.photo && (
                        <Link href={postHref} className="block mt-1.5">
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
                    {post.vidId && post.vidVideoUrl && (
                        <BulletinVidEmbed
                            vidId={post.vidId}
                            videoUrl={post.vidVideoUrl}
                            thumbnailUrl={post.vidThumbnailUrl}
                        />
                    )}
                    {(!isGroup || canInteract) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <div className="relative inline-block">
                                <button
                                    type="button"
                                    className={`inline-flex min-h-9 min-w-9 items-center justify-center gap-1 mb-0.5 border-0 bg-transparent p-1.5 text-[11px] cursor-pointer hover:bg-[#dbe9f7] ${myReaction ? "text-[#003399]" : "text-gray-500"}`}
                                    onClick={() => setOpen(!open)}
                                    aria-label={
                                        myReaction
                                            ? `Change or remove reaction, ${myReaction} ${countOf(myReaction)}`
                                            : "React to this post"
                                    }
                                    aria-haspopup="true"
                                    title="React to this post"
                                >
                                    {myReaction ? (
                                        <>
                                            <span
                                                className="text-[18px] leading-none"
                                                aria-hidden="true"
                                            >
                                                {myReaction}
                                            </span>
                                        </>
                                    ) : (
                                        <Heart
                                            size={23}
                                            strokeWidth={2.25}
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                                {open && (
                                    <ReactionPicker
                                        myReaction={myReaction}
                                        countOf={countOf}
                                        onReact={react}
                                    />
                                )}
                            </div>
                            {reactions.length > 0 && (
                                <span className="text-[11px] text-gray-500 font-bold">
                                    {myReaction &&
                                    reactions.length === 1 &&
                                    reactions[0].type === myReaction
                                        ? reactions[0].count
                                        : reactions
                                              .slice(0, 3)
                                              .map(
                                                  (reaction) =>
                                                      `${reaction.type} ${reaction.count}`,
                                              )
                                              .join(" · ")}
                                </span>
                            )}
                            <Link
                                href={`${postHref}#comments`}
                                className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1 p-1.5 text-[11px] text-gray-500 no-underline hover:bg-[#dbe9f7] hover:text-[#003399]"
                                aria-label={`View comments${comments.length > 0 ? ` (${comments.length})` : ""}`}
                                title="View comments"
                            >
                                <MessageCircle
                                    size={20}
                                    strokeWidth={2.25}
                                    aria-hidden="true"
                                />
                            </Link>
                            {comments.length > 0 && (
                                <span
                                    className="text-[11px] text-gray-500 font-bold"
                                    aria-label={`${comments.length} comments`}
                                >
                                    {comments.length}
                                </span>
                            )}
                        </div>
                    )}
                    {commentsVisible && (
                        <div id="comments">
                            {comments.map((comment) => {
                                const ownComment =
                                    currentUserId === comment.author._id;
                                return (
                                    <div
                                        key={comment._id}
                                        className="bg-[#DBE9F7] p-2 mt-1.5"
                                    >
                                        <Link
                                            href={
                                                comment.author.username
                                                    ? `/${comment.author.username}`
                                                    : "#"
                                            }
                                            className="text-[#003399] font-bold"
                                        >
                                            {displayNameOrUsername(
                                                comment.author.displayName,
                                                comment.author.username,
                                            )}
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
                                                        setEditingCommentId(
                                                            null,
                                                        )
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
                                                        setEditingCommentId(
                                                            null,
                                                        );
                                                    }}
                                                />
                                            ) : (
                                                <BulletinEditForm
                                                    mode="comment"
                                                    itemId={comment._id}
                                                    initialBody={comment.body}
                                                    friends={friends}
                                                    onCancel={() =>
                                                        setEditingCommentId(
                                                            null,
                                                        )
                                                    }
                                                    onSaved={(
                                                        body,
                                                        _visibility,
                                                        mentions,
                                                    ) => {
                                                        setComments((items) =>
                                                            items.map((item) =>
                                                                item._id ===
                                                                comment._id
                                                                    ? {
                                                                          ...item,
                                                                          body,
                                                                          ...(mentions
                                                                              ? {
                                                                                    mentions,
                                                                                }
                                                                              : {}),
                                                                      }
                                                                    : item,
                                                            ),
                                                        );
                                                        setEditingCommentId(
                                                            null,
                                                        );
                                                    }}
                                                />
                                            )
                                        ) : (
                                            <>
                                                <div>
                                                    <LinkedText
                                                        text={comment.body}
                                                        mentions={
                                                            comment.mentions
                                                        }
                                                    />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                                                    {!isGroup &&
                                                        currentUserId && (
                                                            <span className="relative inline-flex items-center">
                                                                <button
                                                                    type="button"
                                                                    className="text-[#003399] underline text-[11px] p-0 border-0 bg-transparent cursor-pointer"
                                                                    onClick={() =>
                                                                        setOpenCommentId(
                                                                            (
                                                                                id,
                                                                            ) =>
                                                                                id ===
                                                                                comment._id
                                                                                    ? null
                                                                                    : comment._id,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        reactingCommentId ===
                                                                        comment._id
                                                                    }
                                                                    title={
                                                                        comment.myReaction
                                                                            ? "Change or remove your reaction"
                                                                            : "React to this comment"
                                                                    }
                                                                    aria-label="React to this comment"
                                                                >
                                                                    React
                                                                </button>
                                                                {commentTotalReactions(
                                                                    comment,
                                                                ) > 0 &&
                                                                    openCommentId !==
                                                                        comment._id && (
                                                                        <span className="text-[11px] text-gray-500 ml-1.5">
                                                                            {(
                                                                                comment.reactions ??
                                                                                []
                                                                            )
                                                                                .slice(
                                                                                    0,
                                                                                    3,
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        r,
                                                                                    ) =>
                                                                                        `${r.type} ${r.count}`,
                                                                                )
                                                                                .join(
                                                                                    " · ",
                                                                                )}
                                                                        </span>
                                                                    )}
                                                                {openCommentId ===
                                                                    comment._id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-10"
                                                                            onClick={() =>
                                                                                setOpenCommentId(
                                                                                    null,
                                                                                )
                                                                            }
                                                                        />
                                                                        <ReactionPicker
                                                                            myReaction={
                                                                                comment.myReaction
                                                                            }
                                                                            reacting={
                                                                                reactingCommentId ===
                                                                                comment._id
                                                                            }
                                                                            countOf={(
                                                                                type,
                                                                            ) =>
                                                                                commentCountOf(
                                                                                    comment,
                                                                                    type,
                                                                                )
                                                                            }
                                                                            onReact={(
                                                                                type,
                                                                            ) =>
                                                                                reactToComment(
                                                                                    comment._id,
                                                                                    type,
                                                                                )
                                                                            }
                                                                        />
                                                                    </>
                                                                )}
                                                            </span>
                                                        )}
                                                    {(ownComment || isOwn) && (
                                                        <span className="inline-flex items-center gap-1.5">
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
                                                                action={() =>
                                                                    isGroup
                                                                        ? deleteGroupCommentAction(
                                                                              groupId!,
                                                                              comment._id,
                                                                          )
                                                                        : deleteBulletinCommentAction(
                                                                              comment._id,
                                                                          )
                                                                }
                                                                className="text-[#cc0000] underline text-[11px] cursor-pointer"
                                                                confirmText="Delete this comment?"
                                                                hideError={
                                                                    isGroup
                                                                }
                                                                onSuccess={() =>
                                                                    setComments(
                                                                        (
                                                                            items,
                                                                        ) =>
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
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {currentUserId && (!isGroup || canInteract) && (
                                <BulletinCommentForm
                                    postId={post._id}
                                    action={
                                        isGroup
                                            ? (formData: FormData) =>
                                                  createGroupCommentAction(
                                                      groupId!,
                                                      post._id,
                                                      formData,
                                                  )
                                            : undefined
                                    }
                                    optimisticComment={
                                        isGroup
                                            ? (
                                                  body: string,
                                              ): SerializedBulletinComment => ({
                                                  _id: crypto.randomUUID(),
                                                  postId: post._id,
                                                  authorId: currentUserId!,
                                                  body,
                                                  createdAt:
                                                      new Date().toISOString(),
                                                  author: {
                                                      _id: currentUserId!,
                                                      username:
                                                          currentUsername ?? "",
                                                      displayName:
                                                          currentUsername
                                                              ? `@${currentUsername}`
                                                              : "You",
                                                      photo: null,
                                                  },
                                              })
                                            : undefined
                                    }
                                    friends={friends}
                                    onPosted={(comment) =>
                                        setComments((items) => [
                                            ...items,
                                            comment,
                                        ])
                                    }
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
