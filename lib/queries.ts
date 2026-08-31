import { getDb, ObjectId } from "./db";
import type { MentionFriend } from "./types";

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const db = getDb();
  const b = await db
    .collection("blocks")
    .findOne({ blockerId: new ObjectId(blockerId), blockedId: new ObjectId(blockedId) });
  return !!b;
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const db = getDb();
  const f = await db.collection("friendships").findOne({
    status: "approved",
    $or: [
      { requesterId: new ObjectId(a), addresseeId: new ObjectId(b) },
      { requesterId: new ObjectId(b), addresseeId: new ObjectId(a) },
    ],
  });
  return !!f;
}

export type FriendshipStatusResult = "none" | "pending_out" | "pending_in" | "friends";

export async function getFriendshipStatus(a: string, b: string): Promise<FriendshipStatusResult> {
  const db = getDb();
  const f = await db.collection("friendships").findOne({
    $or: [
      { requesterId: new ObjectId(a), addresseeId: new ObjectId(b) },
      { requesterId: new ObjectId(b), addresseeId: new ObjectId(a) },
    ],
  });
  if (!f) return "none";
  if (f.status === "approved") return "friends";
  return f.requesterId.toString() === a ? "pending_out" : "pending_in";
}

export async function getFriendIds(userId: string): Promise<ObjectId[]> {
  const db = getDb();
  const fs = await db
    .collection("friendships")
    .find({
      status: "approved",
      $or: [{ requesterId: new ObjectId(userId) }, { addresseeId: new ObjectId(userId) }],
    })
    .toArray();
  return fs.map((f) =>
    f.requesterId.toString() === userId ? f.addresseeId : f.requesterId
  );
}

// Friend-shaped subset used to power the @mention autocomplete in the bulletin
// post composer. Only friends are returned, never arbitrary users.
export async function getFriendSuggestions(userId: string): Promise<MentionFriend[]> {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  const users = await getDb()
    .collection("users")
    .find({ _id: { $in: friendIds } })
    .project({
      _id: 1,
      username: 1,
      displayName: 1,
      firstName: 1,
      lastName: 1,
      photo: 1,
    })
    .toArray();

  return users.map((user) => ({
    _id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    photo: user.photo,
  }));
}

export async function notify(
  userId: string,
  type: string,
  actorId: string,
  text: string,
  link: string
): Promise<void> {
  const db = getDb();
  await db.collection("notifications").insertOne({
    userId: new ObjectId(userId),
    type,
    actorId: new ObjectId(actorId),
    text,
    link,
    read: false,
    createdAt: new Date(),
  });
}

export async function countUnread(userId: string, notificationAcknowledgedAt?: Date) {
  const db = getDb();
  const [messages, friendRequests, notifications] = await Promise.all([
    db.collection("messages").countDocuments({ recipientId: new ObjectId(userId), read: false }),
    db
      .collection("friendships")
      .countDocuments({ addresseeId: new ObjectId(userId), status: "pending" }),
    db.collection("notifications").countDocuments({
      userId: new ObjectId(userId),
      read: false,
      ...(notificationAcknowledgedAt ? { createdAt: { $gt: notificationAcknowledgedAt } } : {}),
    }),
  ]);
  return { messages, friendRequests, notifications };
}
