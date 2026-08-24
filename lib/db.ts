import { MongoClient, Db, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "genggeng";

interface GlobalMongo {
  _mongoClient?: MongoClient;
  _mongoIndexesPromise?: Promise<void>;
}

const g = globalThis as unknown as GlobalMongo;

async function initializeIndexes(client: MongoClient): Promise<void> {
  const db = client.db(dbName);
  const results = await Promise.allSettled([
    db.collection("users").createIndex({ username: 1 }, { unique: true, name: "users_username_unique" }),
    db.collection("users").createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
    db.collection("users").createIndex({ lastActive: -1, hideFromSearch: 1 }, { name: "users_member_search" }),
    db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true, name: "sessions_token_hash_unique" }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "sessions_expiry" }),
    db.collection("emailVerificationTokens").createIndex({ token: 1 }, { unique: true, name: "verification_token_unique" }),
    db.collection("emailVerificationTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "verification_expiry" }),
    db.collection("passwordResetTokens").createIndex({ token: 1 }, { unique: true, name: "reset_token_unique" }),
    db.collection("passwordResetTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "reset_expiry" }),
    db.collection("friendships").createIndex({ requesterId: 1, addresseeId: 1 }, { name: "friendship_pair" }),
    db.collection("messages").createIndex({ recipientId: 1, read: 1, createdAt: -1 }, { name: "messages_unread" }),
    db.collection("messages").createIndex({ senderId: 1, recipientId: 1, createdAt: -1 }, { name: "messages_thread" }),
    db.collection("notifications").createIndex({ userId: 1, read: 1, createdAt: -1 }, { name: "notifications_unread" }),
    db.collection("bulletinPosts").createIndex({ authorId: 1, createdAt: -1 }, { name: "bulletin_author_date" }),
    db.collection("bulletinPosts").createIndex({ visibility: 1, createdAt: -1 }, { name: "bulletin_visibility_date" }),
    db.collection("bulletinComments").createIndex({ postId: 1, createdAt: 1 }, { name: "bulletin_comments" }),
    db.collection("bulletinReactions").createIndex({ postId: 1, userId: 1 }, { unique: true, name: "bulletin_reaction_per_user" }),
    db.collection("chatboxMessages").createIndex({ chatboxId: 1, createdAt: 1 }, { name: "chatbox_messages" }),
    db.collection("blocks").createIndex({ blockerId: 1, blockedId: 1 }, { unique: true, name: "blocks_pair_unique" }),
    db.collection("rateLimits").createIndex({ key: 1 }, { unique: true, name: "rate_limit_key_unique" }),
    db.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "rate_limit_expiry" }),
  ]);

  const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failures.length > 0 && process.env.NODE_ENV !== "test") {
    console.error(`MongoDB index initialization: ${failures.length} index(es) could not be created.`);
  }
}

export function getDb(): Db {
  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env.local");
  }
  if (!g._mongoClient) {
    g._mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20,
      minPoolSize: 1,
      maxIdleTimeMS: 60_000,
      retryReads: true,
      retryWrites: true,
      appName: "genggeng-pro",
    });
  }
  if (!g._mongoIndexesPromise) {
    g._mongoIndexesPromise = g._mongoClient.connect().then(() => initializeIndexes(g._mongoClient!));
  }
  return g._mongoClient.db(dbName);
}

export { ObjectId };

export async function pingDb(): Promise<boolean> {
  try {
    await getDb().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
