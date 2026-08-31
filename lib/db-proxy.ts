import type { ObjectId } from "mongodb";
import { DEV_PROXY, genggiDb } from "@/lib/genggi";

// Remote Mongo-shaped Db/Collection/Cursor shim used by lib/db.ts in dev-proxy
// mode. It implements exactly the surface this codebase relies on
// (find/findOne/insertOne/updateOne/deleteOne/deleteMany/countDocuments/
// aggregate + the find-chaining methods sort/limit/project/toArray, and
// command({ping:1})). Operations are forwarded to the production Genggi API at
// app/api/internal/db/route.ts, which replays them against the real Db.
//
// The shim exists only when DEV_PROXY is true; in production lib/db.ts returns
// the real MongoDB Db.

class RemoteCursor {
  private sortSpec: Record<string, 1 | -1> | undefined;
  private limitN: number | undefined;
  private projectSpec: Record<string, unknown> | undefined;

  constructor(
    private readonly collection: string,
    private readonly filter: Record<string, unknown>,
  ) {}

  sort(spec: Record<string, 1 | -1>): this {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  project(spec: Record<string, unknown>): this {
    this.projectSpec = spec;
    return this;
  }

  async toArray(): Promise<unknown[]> {
    const result = await genggiDb<unknown[]>({
      op: "find",
      collection: this.collection,
      filter: this.filter,
      sort: this.sortSpec,
      limit: this.limitN,
      project: this.projectSpec,
    });
    return Array.isArray(result) ? result : [];
  }
}

export class RemoteCollection {
  constructor(private readonly name: string) {}

  find(filter: Record<string, unknown> = {}): RemoteCursor {
    return new RemoteCursor(this.name, filter);
  }

  async findOne(
    filter: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<unknown> {
    return genggiDb({
      op: "findOne",
      collection: this.name,
      filter,
      options,
    });
  }

  async insertOne(doc: Record<string, unknown>): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId;
  }> {
    return genggiDb({ op: "insertOne", collection: this.name, doc });
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedId: ObjectId | null;
    upsertedCount: number;
  }> {
    return genggiDb({ op: "updateOne", collection: this.name, filter, update, options });
  }

  async deleteOne(filter: Record<string, unknown>): Promise<{
    acknowledged: boolean;
    deletedCount: number;
  }> {
    return genggiDb({ op: "deleteOne", collection: this.name, filter });
  }

  async deleteMany(filter: Record<string, unknown>): Promise<{
    acknowledged: boolean;
    deletedCount: number;
  }> {
    return genggiDb({ op: "deleteMany", collection: this.name, filter });
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    return genggiDb({ op: "countDocuments", collection: this.name, filter });
  }

  aggregate(pipeline: Record<string, unknown>[]): {
    toArray(): Promise<unknown[]>;
  } {
    const collection = this.name;
    return {
      async toArray() {
        const result = await genggiDb<unknown[]>({
          op: "aggregate",
          collection,
          pipeline,
        });
        return Array.isArray(result) ? result : [];
      },
    };
  }
}

export class RemoteDb {
  collection(name: string): RemoteCollection {
    return new RemoteCollection(name);
  }

  async command(cmd: Record<string, unknown>): Promise<unknown> {
    if (DEV_PROXY && Object.keys(cmd).includes("ping")) {
      return genggiDb({ op: "ping" });
    }
    return genggiDb({ op: "ping" });
  }
}

