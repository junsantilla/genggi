import { getDb, ObjectId } from "@/lib/db";
import { getFriendIds } from "@/lib/queries";
import type {
  BulletinComment,
  BulletinCommentWithAuthor,
  BulletinPost,
  BulletinPostCard,
  BulletinPostWithAuthor,
  BulletinPostWithComments,
  BulletinReaction,
  BulletinReactionSummary,
  SerializedBulletinPost,
  User,
} from "@/lib/types";

const BULLETIN_LIMIT = 50;
const BULLETIN_COMMENT_LIMIT = 100;

export const BULLETIN_PAGE_SIZE = 10;

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

async function withReactions(
  posts: BulletinPostWithComments[],
  viewerId: string | null
): Promise<BulletinPostWithComments[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((post) => post._id);
  const reactions = (await getDb()
    .collection("bulletinReactions")
    .find({ postId: { $in: postIds } })
    .toArray()) as unknown as BulletinReaction[];

  const byPost = new Map<string, BulletinReaction[]>();
  for (const r of reactions) {
    const key = r.postId.toString();
    const list = byPost.get(key) ?? [];
    list.push(r);
    byPost.set(key, list);
  }

  return posts.map((post) => {
    const list = byPost.get(post._id.toString()) ?? [];
    const counts = new Map<string, number>();
    let myReaction: string | null = null;
    for (const r of list) {
      counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
      if (viewerId && r.userId.toString() === viewerId) myReaction = r.type;
    }
    const reactions: BulletinReactionSummary[] = [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    return { ...post, reactions, myReaction };
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
    reactions: [],
    myReaction: null,
    comments: commentsByPost.get(post._id.toString()) ?? [],
  }));
}

export async function getHomeBulletinPosts(
  userId: string,
  cursor?: { createdAt: Date; _id: ObjectId } | null,
  limit = BULLETIN_LIMIT
): Promise<BulletinPostWithComments[]> {
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

  const query: Record<string, unknown> = { $or: visibilityRules };
  if (cursor) {
    query.$and = [
      {
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
        ],
      },
    ];
  }

  const posts = (await db
    .collection("bulletinPosts")
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .toArray()) as unknown as BulletinPost[];

  return withReactions(await withComments(await withAuthors(posts)), userId);
}

export function toBulletinPostCard(post: BulletinPostWithComments): BulletinPostCard {
  return {
    _id: post._id.toString(),
    authorId: post.authorId.toString(),
    body: post.body,
    visibility: post.visibility,
    photo: post.photo,
    createdAt: post.createdAt,
    author: {
      _id: post.author._id.toString(),
      username: post.author.username,
      displayName: post.author.displayName,
      photo: post.author.photo,
    },
    reactions: post.reactions,
    myReaction: post.myReaction,
    comments: post.comments.map((c) => ({
      _id: c._id.toString(),
      authorId: c.authorId.toString(),
      body: c.body,
      createdAt: c.createdAt,
      author: {
        _id: c.author._id.toString(),
        username: c.author.username,
        displayName: c.author.displayName,
        photo: c.author.photo,
      },
    })),
  };
}

export function serializeBulletinPost(post: BulletinPostWithComments): SerializedBulletinPost {
  return {
    _id: post._id.toString(),
    authorId: post.authorId.toString(),
    body: post.body,
    visibility: post.visibility,
    photo: post.photo,
    createdAt: post.createdAt.toISOString(),
    author: {
      _id: post.author._id.toString(),
      username: post.author.username,
      displayName: post.author.displayName,
      photo: post.author.photo,
    },
    reactions: post.reactions,
    myReaction: post.myReaction,
    comments: post.comments.map((c) => ({
      _id: c._id.toString(),
      authorId: c.authorId.toString(),
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: {
        _id: c.author._id.toString(),
        username: c.author.username,
        displayName: c.author.displayName,
        photo: c.author.photo,
      },
    })),
  };
}

export async function getBulletinFeedPage(
  userId: string,
  cursor: { createdAt: string; _id: string } | null
): Promise<{
  posts: SerializedBulletinPost[];
  nextCursor: { createdAt: string; _id: string } | null;
}> {
  const parsedCursor = cursor
    ? { createdAt: new Date(cursor.createdAt), _id: new ObjectId(cursor._id) }
    : null;
  const posts = await getHomeBulletinPosts(userId, parsedCursor, BULLETIN_PAGE_SIZE + 1);
  const page = posts.slice(0, BULLETIN_PAGE_SIZE);
  const hasMore = posts.length > BULLETIN_PAGE_SIZE;
  const nextCursor =
    hasMore && page.length > 0
      ? {
          createdAt: page[page.length - 1].createdAt.toISOString(),
          _id: page[page.length - 1]._id.toString(),
        }
      : null;
  return { posts: page.map(serializeBulletinPost), nextCursor };
}

export async function getBulletinPostById(
  postId: string,
  viewerId: string
): Promise<BulletinPostWithComments | null> {
  const db = getDb();
  let oid;
  try {
    oid = new ObjectId(postId);
  } catch {
    return null;
  }

  const post = (await db
    .collection("bulletinPosts")
    .findOne({ _id: oid })) as unknown as BulletinPost | null;
  if (!post) return null;

  const isAuthor = post.authorId.toString() === viewerId;
  if (post.visibility === "private" && !isAuthor) return null;
  if (post.visibility === "friends" && !isAuthor) {
    const friendIds = await getFriendIds(viewerId);
    const isFriend = friendIds.some((id) => id.toString() === post.authorId.toString());
    if (!isFriend) return null;
  }

  const author = (await db
    .collection("users")
    .findOne(
      { _id: post.authorId },
      { projection: { _id: 1, username: 1, displayName: 1, photo: 1 } }
    )) as unknown as Author | null;
  if (!author) return null;

  const [result] = await withReactions(
    await withComments([{ ...post, author }]),
    viewerId
  );
  return result ?? null;
}

export async function getProfileBulletinPosts(
  profileId: string,
  isOwner: boolean,
  isFriend: boolean,
  viewerId: string | null = null
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

  return withReactions(await withComments(await withAuthors(posts)), viewerId);
}
