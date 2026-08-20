import { getDb, ObjectId } from "@/lib/db";
import { getFriendIds } from "@/lib/queries";
import type { BulletinPost, BulletinPostWithAuthor, User } from "@/lib/types";

const BULLETIN_LIMIT = 50;

async function withAuthors(posts: BulletinPost[]): Promise<BulletinPostWithAuthor[]> {
  if (posts.length === 0) return [];

  const authorIds = [...new Map(posts.map((post) => [post.authorId.toString(), post.authorId])).values()];
  const authors = (await getDb()
    .collection("users")
    .find({ _id: { $in: authorIds } })
    .project({ _id: 1, username: 1, displayName: 1 })
    .toArray()) as unknown as Pick<User, "_id" | "username" | "displayName">[];
  const authorById = new Map(authors.map((author) => [author._id.toString(), author]));

  return posts.flatMap((post) => {
    const author = authorById.get(post.authorId.toString());
    return author ? [{ ...post, author }] : [];
  });
}

export async function getHomeBulletinPosts(userId: string): Promise<BulletinPostWithAuthor[]> {
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

  return withAuthors(posts);
}

export async function getProfileBulletinPosts(
  profileId: string,
  isOwner: boolean,
  isFriend: boolean
): Promise<BulletinPostWithAuthor[]> {
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

  return withAuthors(posts);
}
