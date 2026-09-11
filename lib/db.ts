import { MongoClient, Db, ObjectId } from "mongodb";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.error("Failed to set DNS servers:", e);
}


const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "genggeng";

interface GlobalMongo {
  _mongoClient?: MongoClient;
}

const g = globalThis as unknown as GlobalMongo;

export function getDb(): Db {
  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env.local");
  }
  if (!g._mongoClient) {
    g._mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
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
