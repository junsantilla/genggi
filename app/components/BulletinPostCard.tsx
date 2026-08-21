"use client";

import { useState } from "react";
import Link from "next/link";
import {
  deleteBulletinPostAction,
  deleteBulletinCommentAction,
  reactToBulletinPostAction,
} from "@/app/actions";
import { REACTION_TYPES, type BulletinPostCard } from "@/lib/types";
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
  const [open, setOpen] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(post.myReaction);
  const [reactions, setReactions] = useState(post.reactions);
  const [reacting, setReacting] = useState(false);

  const countOf = (type: string) => reactions.find((r) => r.type === type)?.count ?? 0;
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
          <div className="relative inline-block mt-1.5">
            <button
              type="button"
              className={`btn text-[11px] px-2 py-0.5 ${myReaction ? "" : "btn-ghost"}`}
              style={myReaction ? { background: "#ffde00", borderColor: "#b8860b", color: "#5c3d00" } : undefined}
              onClick={() => setOpen((o) => !o)}
              disabled={reacting}
              title={myReaction ? "Change or remove your reaction" : "React to this post"}
            >
              {myReaction ? `${myReaction} ${countOf(myReaction)}` : "React"}
            </button>
            {totalReactions > 0 && !open && (
              <span className="ml-1.5 text-[11px] text-gray-500 align-middle">
                {reactions.slice(0, 3).map((r) => `${r.type} ${r.count}`).join(" · ")}
              </span>
            )}
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute z-20 bottom-full mb-1.5 left-0 bg-white border border-[#6699cc] p-1.5 flex gap-1 shadow-lg">
                  {REACTION_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`text-[18px] leading-none px-1 py-0.5 border cursor-pointer hover:bg-[#dbe9f7] ${
                        myReaction === t ? "border-[#6699cc] bg-[#dbe9f7]" : "border-transparent"
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
