import { toBulletinPostCard } from "@/lib/bulletin";
import type { BulletinPostWithComments } from "@/lib/types";
import Box from "./Box";
import PostCard from "./PostCard";
import BulletinPostForm from "./BulletinPostForm";

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
          {posts.map((post) => (
            <PostCard
              key={post._id.toString()}
              post={toBulletinPostCard(post)}
              currentUserId={currentUserId}
              currentUsername={currentUsername}

            />
          ))}
        </div>
      )}
    </Box>
  );
}
