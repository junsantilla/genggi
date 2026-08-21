"use client";

import Link from "next/link";
import { deleteBulletinPostAction, deleteBulletinCommentAction } from "@/app/actions";
import type { BulletinPostCard } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import ActionButton from "./ActionButton";
import BulletinCommentForm from "./BulletinCommentForm";

const visibilityLabels = {
  public: "public",
  friends: "friends",
  private: "only me",
} as const;

export default function BulletinPostCard({
  post,
  currentUserId,
  currentUsername,
}: {
  post: BulletinPostCard;
  currentUserId?: string;
  currentUsername?: string;
}) {
  const isOwnPost = currentUserId === post.author._id;
  const canModerate = isOwnPost || currentUsername === "genggengpro";

  return (
    <article className="bulletin-post border-b border-dotted border-[#99bbdd] py-2 last:border-0">
      <div className="flex gap-2">
        <Link href={`/u/${post.author.username}`} className="shrink-0 block">
          {post.author.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.photo}
              alt={post.author.displayName}
              className="w-[44px] h-[44px] object-cover border border-[#cc99cc]"
            />
          ) : (
            <div className="friend-thumb-bg w-[44px] h-[44px] border border-[#cc99cc]"></div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <Link href={`/u/${post.author.username}`} className="text-[#003399] font-bold no-underline">
              {post.author.displayName}
            </Link>
            <Link
              href={`/bulletin/${post._id}`}
              className="text-gray-500 text-[11px] no-underline hover:underline"
            >
              {timeAgo(post.createdAt)} · {visibilityLabels[post.visibility]}
            </Link>
          </div>
          <Link
            href={`/bulletin/${post._id}`}
            className="block no-underline text-inherit hover:underline"
          >
            <p className="whitespace-pre-wrap text-[12px] mt-1 mb-0">{post.body}</p>
          </Link>
          {post.photo && (
            <Link href={`/bulletin/${post._id}`} className="block mt-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.photo}
                alt="Post photo"
                className="max-w-[420px] w-full border border-[#99bbdd]"
              />
            </Link>
          )}
          {canModerate && (
            <div className="mt-1">
              <ActionButton
                action={deleteBulletinPostAction.bind(null, post._id)}
                className="btn btn-danger"
                confirmText="Delete this bulletin post?"
              >
                Delete
              </ActionButton>
            </div>
          )}
          {post.comments.length > 0 && (
            <div className="mt-1.5 border-l-2 border-[#99bbdd] pl-2">
              {post.comments.map((comment) => {
                const canDelete =
                  currentUserId === comment.author._id || isOwnPost;
                return (
                  <div
                    key={comment._id}
                    className="text-[12px] py-0.5 leading-snug"
                  >
                    <Link
                      href={`/u/${comment.author.username}`}
                      className="text-[#003399] font-bold no-underline"
                    >
                      {comment.author.displayName}
                    </Link>{" "}
                    <span className="text-gray-500">({timeAgo(comment.createdAt)})</span>{" "}
                    <span className="whitespace-pre-wrap">{comment.body}</span>
                    {canDelete && (
                      <ActionButton
                        action={deleteBulletinCommentAction.bind(null, comment._id)}
                        className="text-[#cc0000] underline text-[11px] ml-1 p-0 border-0 bg-transparent"
                        confirmText="Delete this comment?"
                      >
                        Delete
                      </ActionButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {currentUserId && <BulletinCommentForm postId={post._id} />}
        </div>
      </div>
    </article>
  );
}
