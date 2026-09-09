import { toBulletinPostCard } from "@/lib/bulletin";
import type {
    BulletinPostWithMentions,
    MentionFriend,
} from "@/lib/types";
import Box from "./Box";
import PostCard from "./PostCard";
import BulletinPostForm from "./BulletinPostForm";

export default function BulletinBoard({
    posts,
    currentUserId,
    currentUsername,
    showComposer = false,
    title = "Bulletin Board",
    border,
    bg,
    showComments = false,
    friends,
}: {
    posts: BulletinPostWithMentions[];
    currentUserId?: string;
    currentUsername?: string;
    showComposer?: boolean;
    title?: string;
    border?: string;
    bg?: string;
    showComments?: boolean;
    // Friends of the viewer, used for @mentions in the comment composer.
    friends?: MentionFriend[];
}) {
    return (
        <Box title={title} className="bulletin-board" border={border} bg={bg}>
            {showComposer && <BulletinPostForm />}
            {posts.length === 0 ? (
                <p className="profile-empty">
                    {showComposer
                        ? "No bulletins yet. Be the first to post!"
                        : "No bulletins to show."}
                </p>
            ) : (
                <div className="bulletin-board-posts">
                    {posts.map((post) => (
                        <PostCard
                            key={post._id.toString()}
                            post={toBulletinPostCard(post)}
                            currentUserId={currentUserId}
                            currentUsername={currentUsername}
                            showComments={showComments}
                            friends={friends}
                        />
                    ))}
                </div>
            )}
        </Box>
    );
}
