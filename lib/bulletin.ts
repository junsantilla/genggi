import { getDb, ObjectId } from "@/lib/db";
import { getFriendIds } from "@/lib/queries";
import type {
  BulletinComment,
  BulletinCommentWithAuthor,
  BulletinPost,
  BulletinPostWithAuthor,
  BulletinPostWithComments,
  User,
} from "@/lib/types";

const BULLETIN_LIMIT = 50;
const BULLETIN_COMMENT_LIMIT = 100;

type Author = Pick<User, "_id" | "username" | "displayName" | "photo">;

async function withAuthors(posts: BulletinPost[]): Promise<BulletinPostWithAuthor[]> {
  if (posts.length === 0) return [];

  const authorIds = [...new Map(posts.map((post) => [post.authorId.toString(), post.authorId])).values()];
  const authors = (await getDb()
    .collection("users")
    .find({ _id: { $in: authorIds } })
    .project({ _id: 1, username: 1, displayName: 1, photo: 1 })
    .toArray()) as unknown as Author[];
  const authorById = new Map(authors.map((author) => [author._id.toString(), author]));

  return posts.flatMap((post) => {
    const author = authorById.get(post.authorId.toString());
    return author ? [{ ...post, author }] : [];
  });
}

async function withComments(
  posts: BulletinPostWithAuthor[]
): Promise<BulletinPostWithComments[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((post) => post._id);
  const comments = (await getDb()
    .collection("bulletinComments")
    .find({ postId: { $in: postIds } })
    .sort({ createdAt: 1 })
    .limit(BULLETIN_COMMENT_LIMIT)
    .toArray()) as unknown as BulletinComment[];

  const commentAuthorIds = [
    ...new Map(comments.map((c) => [c.authorId.toString(), c.authorId])).values(),
  ];
  const commentAuthors =
    commentAuthorIds.length > 0
      ? ((await getDb()
          .collection("users")
          .find({ _id: { $in: commentAuthorIds } })
          .project({ _id: 1, username: 1, displayName: 1, photo: 1 })
          .toArray()) as unknown as Author[])
      : [];
  const commentAuthorById = new Map(
    commentAuthors.map((author) => [author._id.toString(), author])
  );

  const commentsByPost = new Map<string, BulletinCommentWithAuthor[]>();
  for (const comment of comments) {
    const author = commentAuthorById.get(comment.authorId.toString());
    if (!author) continue;
    const key = comment.postId.toString();
    const list = commentsByPost.get(key) ?? [];
    list.push({ ...comment, author });
    commentsByPost.set(key, list);
  }

  return posts.map((post) => ({
    ...post,
    comments: commentsByPost.get(post._id.toString()) ?? [],
  }));
}

export async function getHomeBulletinPosts(userId: string): Promise<BulletinPostWithComments[]> {
  const db = getDb();
  const userObjectId = new ObjectId(userId);
  const friendIds = await getFriendIds(userId);
  const visibilityRules: object[] = [
    { authorId: userObjectId },
    { visibility: "public" },
  ];

  if (friendIds.length > 0) {
    visibilityRules.push({
      authorId: { $in: friendIds },
      visibility: { $in: ["public", "friends"] },
    });
  }

  const posts = (await db
    .collection("bulletinPosts")
    .find({ $or: visibilityRules })
    .sort({ createdAt: -1 })
    .limit(BULLETIN_LIMIT)
    .toArray()) as unknown as BulletinPost[];

  return withComments(await withAuthors(posts));
}

export async function getProfileBulletinPosts(
  profileId: string,
  isOwner: boolean,
  isFriend: boolean
): Promise<BulletinPostWithComments[]> {
  const visibility = isOwner
    ? undefined
    : isFriend
      ? { $in: ["public", "friends"] }
      : "public";
  const filter = {
    authorId: new ObjectId(profileId),
    ...(visibility ? { visibility } : {}),
  };
  const posts = (await getDb()
    .collection("bulletinPosts")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(BULLETIN_LIMIT)
    .toArray()) as unknown as BulletinPost[];

  return withComments(await withAuthors(posts));
}
