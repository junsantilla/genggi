import { getDb, ObjectId } from "@/lib/db";
import type { Group, GroupListItem, GroupMember, GroupPost, GroupPostCard, User } from "@/lib/types";

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

export async function getGroupsForUser(_userId: string): Promise<GroupListItem[]> {
  const db = getDb();
  const groups = (await db.collection("groups").find({}).sort({ createdAt: -1 }).limit(100).toArray()) as unknown as Group[];
  return groups.map((group) => ({
    _id: group._id.toString(), name: group.name, privacy: group.privacy,
    photo: group.photo, ownerId: group.ownerId.toString(), createdAt: group.createdAt,
  }));
}

export async function getGroupPosts(groupId: ObjectId): Promise<GroupPostCard[]> {
  const db = getDb();
  const posts = (await db.collection("groupPosts").find({ groupId }).sort({ createdAt: -1 }).limit(100).toArray()) as unknown as GroupPost[];
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
