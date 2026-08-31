import { MongoClient, Db, ObjectId } from "mongodb";
import { DEV_PROXY } from "@/lib/genggi";
import { RemoteDb } from "@/lib/db-proxy";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "genggeng";

interface GlobalMongo {
  _mongoClient?: MongoClient;
}

const g = globalThis as unknown as GlobalMongo;

/**
 * Returns the MongoDB handle to use for data access.
 *
 * In production (or whenever MONGODB_URI is set) this is the real MongoDB
 * client. In local development without production DB secrets, it is a remote
 * Db shim that forwards every operation to the production Genggi API, so
 * contributors never need MONGODB_URI locally. See lib/genggi.ts and
 * app/api/internal/db/route.ts for the proxy boundary.
 */
export function getDb(): Db {
  if (!uri) {
    if (DEV_PROXY) return remoteDb as unknown as Db;
    throw new Error(
      "MONGODB_URI is not set. For local development without production " +
        "secrets, set GENGGI_API_TOKEN in .env.local instead. See README.md.",
    );
  }
  if (!g._mongoClient) {
    g._mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  return g._mongoClient.db(dbName);
}

const remoteDb = new RemoteDb();

export { ObjectId };

export async function pingDb(): Promise<boolean> {
  try {
    await getDb().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
