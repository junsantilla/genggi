import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";

interface RateLimitRecord {
  key: string;
  count: number;
  expiresAt: Date;
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function consumeRateLimit(
  namespace: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const key = digest(`${namespace}:${subject}:${bucket}`);
  const expiresAt = new Date((bucket + 1) * windowSeconds * 1000 + 60_000);
  const collection = getDb().collection<RateLimitRecord>("rateLimits");
  const result = await collection.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { key, expiresAt } },
    { upsert: true, returnDocument: "after", projection: { count: 1 } },
  );
  return (result?.count ?? limit + 1) <= limit;
}

export function getRequestSubject(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown-client";
}
