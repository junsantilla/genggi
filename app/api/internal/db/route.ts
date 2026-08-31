import { NextRequest, NextResponse } from "next/server";
import { EJSON } from "bson";
import { getDb, ObjectId } from "@/lib/db";

// This route exists so the local development server can run the app against
// the production database WITHOUT holding the production MONGODB_URI. It is
// the "Genggi API" boundary in:
//
//   Local Next.js  ->  Genggi production API  ->  Production Database
//
// It is only ever reachable over the network and is gated by a shared bearer
// token (GENGGI_API_TOKEN) that lives on the production deployment. It must
// never run with production secrets disabled, and it must never be reachable
// from the browser: the token is server-to-server only and the route rejects
// any request that lacks it.

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function assertToken(req: NextRequest): boolean {
  const expected = process.env.GENGGI_API_TOKEN;
  // Never expose the route when no token is configured, even in dev, so that
  // a misconfigured production deployment cannot leak the whole database.
  if (!expected) return false;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return !!token && token === expected;
}

/**
 * Each request describes one Collection/Db operation. Supported ops mirror
 * exactly what lib/db-proxy.ts emits:
 *
 *   { op: "findOne", collection, filter, options }
 *   { op: "insertOne", collection, doc }
 *   { op: "updateOne", collection, filter, update, options }
 *   { op: "deleteOne", collection, filter }
 *   { op: "deleteMany", collection, filter }
 *   { op: "countDocuments", collection, filter }
 *   { op: "aggregate", collection, pipeline }
 *   { op: "find", collection, filter, sort, limit, project }  // returns toArray()
 *   { op: "ping" }
 *
 * Filters, docs, and pipeline stages are EJSON-decoded so ObjectId/Date and
 * $-operators round-trip. Results are EJSON-encoded on the way back.
 */
export async function POST(req: NextRequest) {
  if (!assertToken(req)) return unauthorized();
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "DB proxy unavailable: MONGODB_URI not set on server" },
      { status: 503 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    // The client EJSON-encodes the body so ObjectId/Date/$-operators survive.
    // Parse with relaxed:false to reconstruct BSON types on the server.
    payload = EJSON.parse(await req.text(), { relaxed: false }) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const op = String(payload.op || "");
  const collection = payload.collection ? String(payload.collection) : null;
  const db = getDb();

  try {
    let result: unknown;

    switch (op) {
      case "ping": {
        result = await db.command({ ping: 1 });
        break;
      }
      case "findOne": {
        if (!collection) throw new Error("collection required");
        result = await db
          .collection(collection)
          .findOne(payload.filter as Record<string, unknown>, payload.options as Record<string, unknown> | undefined);
        break;
      }
      case "insertOne": {
        if (!collection) throw new Error("collection required");
        result = await db.collection(collection).insertOne(payload.doc as Record<string, unknown>);
        break;
      }
      case "updateOne": {
        if (!collection) throw new Error("collection required");
        result = await db
          .collection(collection)
          .updateOne(
            payload.filter as Record<string, unknown>,
            payload.update as Record<string, unknown>,
            payload.options as Record<string, unknown> | undefined,
          );
        break;
      }
      case "deleteOne": {
        if (!collection) throw new Error("collection required");
        result = await db.collection(collection).deleteOne(payload.filter as Record<string, unknown>);
        break;
      }
      case "deleteMany": {
        if (!collection) throw new Error("collection required");
        result = await db.collection(collection).deleteMany(payload.filter as Record<string, unknown>);
        break;
      }
      case "countDocuments": {
        if (!collection) throw new Error("collection required");
        result = await db.collection(collection).countDocuments(payload.filter as Record<string, unknown>);
        break;
      }
      case "aggregate": {
        if (!collection) throw new Error("collection required");
        result = await db
          .collection(collection)
          .aggregate(payload.pipeline as Record<string, unknown>[])
          .toArray();
        break;
      }
      case "find": {
        if (!collection) throw new Error("collection required");
        let cursor = db.collection(collection).find(payload.filter as Record<string, unknown>);
        if (payload.sort) cursor = cursor.sort(payload.sort as Record<string, 1 | -1>);
        if (payload.limit != null) cursor = cursor.limit(Number(payload.limit));
        if (payload.project) cursor = cursor.project(payload.project as Record<string, unknown>);
        result = await cursor.toArray();
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
    }

    // EJSON-encode the result so ObjectId/Date survive the HTTP boundary.
    return NextResponse.json({ ok: true, result: EJSON.stringify(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ObjectId helper: the proxy sometimes needs to construct ObjectIds on the
// server when a filter contains a raw string id. Exported for tests.
export { ObjectId };
