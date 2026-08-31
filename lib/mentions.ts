import { getDb } from "./db";
import type { ObjectId } from "./db";
import { getFriendIds } from "./queries";

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

// Resolves @username mentions in a post body to the user ids of friends of the
// author. Non-friends and unknown usernames are silently dropped, so the client
// can never tag someone who isn't a friend.
export async function resolveMentionedUserIds(
  authorId: string,
  body: string,
): Promise<ObjectId[]> {
  const usernames = extractMentionedUsernames(body);
  if (usernames.length === 0) return [];

  const friendIds = await getFriendIds(authorId);
  if (friendIds.length === 0) return [];
  const friendIdSet = new Set(friendIds.map((id) => id.toString()));

  const db = getDb();
  const users = await db
    .collection("users")
    .find({ username: { $in: usernames } })
    .project({ _id: 1, username: 1 })
    .toArray();

  return users
    .filter((user) => friendIdSet.has(user._id.toString()))
    .map((user) => user._id);
}
