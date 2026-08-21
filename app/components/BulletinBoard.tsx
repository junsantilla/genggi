import Link from "next/link";
import { deleteBulletinPostAction, deleteBulletinCommentAction } from "@/app/actions";
import type { BulletinPostWithComments } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import ActionButton from "./ActionButton";
import Box from "./Box";
import BulletinCommentForm from "./BulletinCommentForm";
import BulletinPostForm from "./BulletinPostForm";

const visibilityLabels = {
  public: "public",
  friends: "friends",
  private: "only me",
} as const;

export default function BulletinBoard({
  posts,
  currentUserId,
  currentUsername,
  showComposer = false,
  title = "📌 Bulletin Board",
  border,
  bg,
}: {
  posts: BulletinPostWithComments[];
  currentUserId?: string;
  currentUsername?: string;
  showComposer?: boolean;
  title?: string;
  border?: string;
  bg?: string;
}) {
  return (
    <Box title={title} className="bulletin-board" border={border} bg={bg}>
      {showComposer && <BulletinPostForm />}
      {posts.length === 0 ? (
        <p className="text-gray-500 italic text-[12px]">
          {showComposer ? "No bulletins yet. Be the first to post!" : "No bulletins to show."}
        </p>
      ) : (
        <div>
          {posts.map((post) => {
            const isOwnPost = currentUserId === post.author._id.toString();
            const canModerate = isOwnPost || currentUsername === "genggengpro";
            return (
              <article key={post._id.toString()} className="bulletin-post border-b border-dotted border-[#99bbdd] py-2 last:border-0">
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
                      <span className="text-gray-500 text-[11px]">
                        {timeAgo(post.createdAt)} · {visibilityLabels[post.visibility]}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[12px] mt-1 mb-0">{post.body}</p>
                    {post.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.photo}
                        alt="Post photo"
                        className="max-w-[420px] w-full mt-1.5 border border-[#99bbdd]"
                      />
                    )}
                {canModerate && (
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
                {post.comments.length > 0 && (
                  <div className="mt-1.5 border-l-2 border-[#99bbdd] pl-2">
                    {post.comments.map((comment) => {
                      const canDelete =
                        currentUserId === comment.author._id.toString() || isOwnPost;
                      return (
                        <div
                          key={comment._id.toString()}
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
                              action={deleteBulletinCommentAction.bind(null, comment._id.toString())}
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
                    {currentUserId && <BulletinCommentForm postId={post._id.toString()} />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Box>
  );
}
