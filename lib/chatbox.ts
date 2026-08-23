import { getDb, ObjectId } from "@/lib/db";
import { getFriendIds, areFriends } from "@/lib/queries";
import type {
  Chatbox,
  ChatboxAuthorCard,
  ChatboxListItem,
  ChatboxMessage,
  ChatboxMessageCard,
  User,
} from "@/lib/types";

type Author = Pick<User, "_id" | "username" | "displayName" | "photo">;

// A user may view/chat in a box if it's public, or if they are the creator,
// or if it's friends-only and they are friends with the creator.
export async function canAccessChatbox(
  chatbox: Chatbox,
  viewerId: string
): Promise<boolean> {
  if (chatbox.visibility === "public") return true;
  if (chatbox.createdBy.toString() === viewerId) return true;
  return areFriends(chatbox.createdBy.toString(), viewerId);
}

async function resolveAuthors(
  ids: ObjectId[]
): Promise<Map<string, Author>> {
  const unique = [...new Map(ids.map((id) => [id.toString(), id])).values()];
  if (unique.length === 0) return new Map();
  const authors = (await getDb()
    .collection("users")
    .find({ _id: { $in: unique } })
    .project({ _id: 1, username: 1, displayName: 1, photo: 1 })
    .toArray()) as unknown as Author[];
  return new Map(authors.map((a) => [a._id.toString(), a]));
}

function toAuthorCard(a: Author): ChatboxAuthorCard {
  return {
    _id: a._id.toString(),
    username: a.username,
    displayName: a.displayName,
    photo: a.photo,
  };
}

// Chatboxes the viewer can join: public boxes, plus friends-only boxes created
// by the viewer or by a friend.
export async function getAvailableChatboxes(
  viewerId: string
): Promise<ChatboxListItem[]> {
  const db = getDb();
  const friendIds = await getFriendIds(viewerId);
  const authorIds = [new ObjectId(viewerId), ...friendIds];

  const boxes = (await db
    .collection("chatboxes")
    .find({
      $or: [{ visibility: "public" }, { createdBy: { $in: authorIds } }],
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray()) as unknown as Chatbox[];

  const authorMap = await resolveAuthors(boxes.map((b) => b.createdBy));

  // Per-chatbox message counts and last-activity timestamps.
  const stats = (await db
    .collection("chatboxMessages")
    .aggregate([
      { $match: { chatboxId: { $in: boxes.map((b) => b._id) } } },
      {
        $group: {
          _id: "$chatboxId",
          count: { $sum: 1 },
          last: { $max: "$createdAt" },
        },
      },
    ])
    .toArray()) as unknown as { _id: ObjectId; count: number; last: Date | null }[];

  const statsMap = new Map(
    stats.map((s) => [s._id.toString(), { count: s.count, last: s.last }])
  );

  const items: ChatboxListItem[] = [];
  for (const b of boxes) {
    const author = authorMap.get(b.createdBy.toString());
    if (!author) continue;
    const s = statsMap.get(b._id.toString());
    items.push({
      _id: b._id.toString(),
      name: b.name,
      visibility: b.visibility,
      createdAt: b.createdAt,
      createdBy: b.createdBy.toString(),
      author: toAuthorCard(author),
      messageCount: s?.count ?? 0,
      lastMessageAt: s?.last ?? null,
    });
  }
  return items;
}

export async function getChatboxById(id: string): Promise<Chatbox | null> {
  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  return (await getDb()
    .collection("chatboxes")
    .findOne({ _id: oid })) as unknown as Chatbox | null;
}

export function toChatboxMessageCard(
  m: ChatboxMessage & { author: ChatboxAuthorCard }
): ChatboxMessageCard {
  return {
    _id: m._id.toString(),
    chatboxId: m.chatboxId.toString(),
    senderId: m.senderId.toString(),
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    author: m.author,
    ...(m.replyTo ? { replyTo: m.replyTo } : {}),
  };
}

export async function getChatboxMessages(
  chatboxId: ObjectId
): Promise<(ChatboxMessage & { author: ChatboxAuthorCard })[]> {
  const db = getDb();
  const messages = (await db
    .collection("chatboxMessages")
    .find({ chatboxId })
    .sort({ createdAt: 1 })
    .limit(300)
    .toArray()) as unknown as ChatboxMessage[];

  const authorMap = await resolveAuthors(messages.map((m) => m.senderId));
  return messages
    .map((m) => {
      const author = authorMap.get(m.senderId.toString());
      if (!author) return null;
      return { ...m, author: toAuthorCard(author) };
    })
    .filter(
      (m): m is ChatboxMessage & { author: ChatboxAuthorCard } => m !== null
    );
}
