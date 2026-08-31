import { getDb } from "./db";
import type { ObjectId } from "./db";
import { getFriendIds } from "./queries";
import type { BulletinMentionRef } from "./types";

// Matches @username tokens where the "@" starts a word (start of string or
// preceded by whitespace) so emails like a@b.com are ignored. Usernames follow
// the signup rule: 3-20 lowercase letters, digits, and underscores.
const MENTION_PATTERN = /(?:^|\s)@([a-z0-9_]{3,20})/g;

export function extractMentionedUsernames(body: string): string[] {
  const usernames = new Set<string>();
  const re = new RegExp(MENTION_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    usernames.add(match[1].toLowerCase());
  }
  return [...usernames];
}

type MentionedUser = { _id: ObjectId; username: string };

// Resolves @username mentions in a body to the friends of the author. Unknown
// usernames and non-friends are silently dropped, so the client can never tag
// someone who isn't a friend.
export async function findMentionedUsers(
  authorId: string,
  body: string,
): Promise<MentionedUser[]> {
  const usernames = extractMentionedUsernames(body);
  if (usernames.length === 0) return [];

  const friendIds = await getFriendIds(authorId);
  if (friendIds.length === 0) return [];
  const friendIdSet = new Set(friendIds.map((id) => id.toString()));

  const db = getDb();
  const users = (await db
    .collection("users")
    .find({ username: { $in: usernames } })
    .project({ _id: 1, username: 1 })
    .toArray()) as unknown as MentionedUser[];

  return users.filter((user) => friendIdSet.has(user._id.toString()));
}

export async function resolveMentionedUserIds(
  authorId: string,
  body: string,
): Promise<ObjectId[]> {
  return (await findMentionedUsers(authorId, body)).map((user) => user._id);
}

export async function resolveMentionRefs(
  authorId: string,
  body: string,
): Promise<BulletinMentionRef[]> {
  return (await findMentionedUsers(authorId, body)).map((user) => ({
    userId: user._id.toString(),
    username: user.username,
  }));
}
