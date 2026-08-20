import Link from "next/link";
import { deleteBulletinPostAction } from "@/app/actions";
import type { BulletinPostWithAuthor } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import ActionButton from "./ActionButton";
import Box from "./Box";
import BulletinPostForm from "./BulletinPostForm";

const visibilityLabels = {
  public: "public",
  friends: "friends",
  private: "only me",
} as const;

export default function BulletinBoard({
  posts,
  currentUserId,
  showComposer = false,
  title = "📌 Bulletin Board",
}: {
  posts: BulletinPostWithAuthor[];
  currentUserId?: string;
  showComposer?: boolean;
  title?: string;
}) {
  return (
    <Box title={title} className="bulletin-board">
      {showComposer && <BulletinPostForm />}
      {posts.length === 0 ? (
        <p className="text-gray-500 italic text-[11px]">
          {showComposer ? "No bulletins yet. Be the first to post!" : "No bulletins to show."}
        </p>
      ) : (
        <div>
          {posts.map((post) => {
            const isOwnPost = currentUserId === post.author._id.toString();
            return (
              <article key={post._id.toString()} className="bulletin-post border-b border-dotted border-[#99bbdd] py-2 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <Link href={`/u/${post.author.username}`} className="text-[#003399] font-bold no-underline">
                    {post.author.displayName}
                  </Link>
                  <span className="text-gray-500 text-[10px]">
                    {timeAgo(post.createdAt)} · {visibilityLabels[post.visibility]}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-[11px] mt-1 mb-0">{post.body}</p>
                {isOwnPost && (
                  <div className="mt-1">
                    <ActionButton
                      action={deleteBulletinPostAction.bind(null, post._id.toString())}
                      className="btn btn-danger"
                      confirmText="Delete this bulletin post?"
                    >
                      Delete
                    </ActionButton>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Box>
  );
}
