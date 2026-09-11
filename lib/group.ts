import { getDb, ObjectId } from "@/lib/db";
import type { Group, GroupListItem, GroupMember, GroupPost, GroupPostCard, User } from "@/lib/types";

export type MembersCursor = { createdAt: string; _id: string } | null;
export type MemberListItem = { _id: string; username: string; displayName: string; photo: string | null; location?: string; gender?: string; relationshipStatus?: string; createdAt: string };

type Author = Pick<User, "_id" | "username" | "displayName" | "photo">;

export async function getGroupById(id: string): Promise<Group | null> {
  try {
    return (await getDb().collection("groups").findOne({ _id: new ObjectId(id) })) as unknown as Group | null;
  } catch {
    return null;
  }
}

export async function getGroupMembership(groupId: ObjectId, userId: ObjectId): Promise<GroupMember | null> {
  return (await getDb().collection("groupMembers").findOne({ groupId, userId })) as unknown as GroupMember | null;
}

export async function canAccessGroup(group: Group, userId: string): Promise<boolean> {
  const member = await getGroupMembership(group._id, new ObjectId(userId));
  return member?.status === "approved";
}

export async function getMembersPage(userId: string | null, cursor: MembersCursor = null) {
  const filter: Record<string, unknown> = { banned: { $ne: true }, hideFromSearch: { $ne: true } };
  if (userId) filter._id = { $ne: new ObjectId(userId) };
  if (cursor) filter.$or = [{ createdAt: { $lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), _id: { $lt: new ObjectId(cursor._id) } }];
  const users = await getDb().collection("users").find(filter).sort({ createdAt: -1, _id: -1 }).limit(30).toArray();
  const members = users.map((user) => ({ _id: user._id.toString(), username: user.username, displayName: user.displayName, photo: user.photo ?? null, location: user.location, gender: user.gender, relationshipStatus: user.relationshipStatus, createdAt: new Date(user.createdAt).toISOString() }));
  const last = users.at(-1);
  return { members, nextCursor: users.length === 30 && last ? { createdAt: new Date(last.createdAt).toISOString(), _id: last._id.toString() } : null };
}

export async function getGroupsForUser(_userId: string): Promise<GroupListItem[]> {
  const db = getDb();
  const groups = (await db.collection("groups").find({}).sort({ createdAt: -1 }).limit(100).toArray()) as unknown as Group[];
  return groups.map((group) => ({
    _id: group._id.toString(), name: group.name, privacy: group.privacy,
    photo: group.photo, ownerId: group.ownerId.toString(), createdAt: group.createdAt,
  }));
}

async function toGroupPostCards(posts: GroupPost[]): Promise<GroupPostCard[]> {
  const db = getDb();
  const authors = (await db.collection("users").find({ _id: { $in: posts.map((p) => p.authorId) } }).project({ _id: 1, username: 1, displayName: 1, photo: 1 }).toArray()) as unknown as Author[];
  const map = new Map(authors.map((a) => [a._id.toString(), a]));
  const postIds = posts.map((post) => post._id);
  const reactions = (await db.collection("groupReactions").find({ postId: { $in: postIds } }).toArray()) as unknown as { postId: ObjectId; userId: ObjectId; type: string }[];
  const comments = (await db.collection("groupComments").find({ postId: { $in: postIds } }).sort({ createdAt: 1 }).limit(100).toArray()) as unknown as { _id: ObjectId; postId: ObjectId; authorId: ObjectId; body: string; createdAt: Date }[];
  const commentAuthors = (await db.collection("users").find({ _id: { $in: comments.map((c) => c.authorId) } }).project({ _id: 1, username: 1, displayName: 1, photo: 1 }).toArray()) as unknown as Author[];
  const commentAuthorMap = new Map(commentAuthors.map((a) => [a._id.toString(), a]));
  return posts.flatMap((post) => {
    const author = map.get(post.authorId.toString());
    if (!author) return [];
    const postReactions = reactions.filter((reaction) => reaction.postId.toString() === post._id.toString());
    const counts = new Map<string, number>();
    const myReaction: string | null = null;
    for (const reaction of postReactions) { counts.set(reaction.type, (counts.get(reaction.type) ?? 0) + 1); }
    const postComments = comments.filter((comment) => comment.postId.toString() === post._id.toString()).flatMap((comment) => {
      const commentAuthor = commentAuthorMap.get(comment.authorId.toString());
      return commentAuthor ? [{ _id: comment._id.toString(), authorId: comment.authorId.toString(), body: comment.body, createdAt: comment.createdAt, author: { ...commentAuthor, _id: commentAuthor._id.toString() } }] : [];
    });
    return [{ ...post, _id: post._id.toString(), groupId: post.groupId.toString(), authorId: post.authorId.toString(), createdAt: post.createdAt.toISOString(), author: { ...author, _id: author._id.toString() }, reactions: [...counts.entries()].map(([type, count]) => ({ type, count })), myReaction, comments: postComments }];
  });
}

export async function getGroupPosts(groupId: ObjectId): Promise<GroupPostCard[]> {
  const posts = (await getDb().collection("groupPosts").find({ groupId }).sort({ createdAt: -1 }).limit(100).toArray()) as unknown as GroupPost[];
  return toGroupPostCards(posts);
}

// Single post lookup for the dedicated group post page (`/groups/<id>/posts/<postId>`),
// mirroring the bulletin permalink page.
export async function getGroupPost(postId: string, groupId: ObjectId): Promise<GroupPostCard | null> {
  let postOid: ObjectId;
  try {
    postOid = new ObjectId(postId);
  } catch {
    return null;
  }
  const post = (await getDb().collection("groupPosts").findOne({ _id: postOid, groupId })) as unknown as GroupPost | null;
  if (!post) return null;
  const [card] = await toGroupPostCards([post]);
  return card ?? null;
}

// Feed-shaped group post: the card plus the group's name, so the bulletin feed
// can label where the post came from.
export type GroupFeedPost = GroupPostCard & { groupName: string };

async function withGroupNames(cards: GroupPostCard[]): Promise<GroupFeedPost[]> {
  if (cards.length === 0) return [];
  const groupIds = [...new Set(cards.map((card) => card.groupId))].map((id) => new ObjectId(id));
  const groups = (await getDb()
    .collection("groups")
    .find({ _id: { $in: groupIds } })
    .project({ name: 1 })
    .toArray()) as unknown as { _id: ObjectId; name: string }[];
  const nameById = new Map(groups.map((group) => [group._id.toString(), group.name]));
  return cards.map((card) => ({ ...card, groupName: nameById.get(card.groupId) ?? "Group" }));
}

// Group posts shown in the homepage bulletin feed. Restricted to groups the
// viewer is an approved member of, so there group posts stay member-only.
// Paginated with the same (createdAt, _id) cursor as the bulletin feed.
export async function getGroupFeedPosts(
  userId: string,
  cursor: { createdAt: Date; _id: ObjectId } | null,
  limit: number,
): Promise<GroupFeedPost[]> {
  const memberships = (await getDb()
    .collection("groupMembers")
    .find({ userId: new ObjectId(userId), status: "approved" })
    .project({ groupId: 1 })
    .toArray()) as unknown as { groupId: ObjectId }[];
  if (memberships.length === 0) return [];

  const query: Record<string, unknown> = {
    groupId: { $in: memberships.map((membership) => membership.groupId) },
  };
  if (cursor) {
    query.$or = [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
    ];
  }

  const posts = (await getDb()
    .collection("groupPosts")
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .toArray()) as unknown as GroupPost[];
  return withGroupNames(await toGroupPostCards(posts));
}
