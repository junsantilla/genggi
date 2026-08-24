import { timingSafeEqual, createHash } from "node:crypto";
import { ObjectId } from "mongodb";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters.");
  }
  return secret;
}

export function safeObjectId(value: unknown): ObjectId | null {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) return null;
  return new ObjectId(value);
}

export function boundedString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function safeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function signaturesEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getAppOrigin(headers: { get(name: string): string | null }): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
      throw new Error("APP_URL must use https in production.");
    }
    return url.origin;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be set in production.");
  }
  return `${headers.get("x-forwarded-proto") === "https" ? "https" : "http"}://${headers.get("host") || "localhost:3000"}`;
}

export function isSafeRasterImage(fileType: string, buffer: Buffer): boolean {
  const type = fileType.toLowerCase();
  if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(type)) return false;
  return (
    (type === "image/jpeg" && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (type === "image/png" && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) ||
    (type === "image/gif" && (buffer.subarray(0, 6).toString() === "GIF87a" || buffer.subarray(0, 6).toString() === "GIF89a")) ||
    (type === "image/webp" && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP")
  );
}
