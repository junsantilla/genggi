import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHmac, timingSafeEqual, scryptSync } from "node:crypto";
import { getDb, ObjectId } from "./db";
import { getAuthSecret, hashToken, signaturesEqual } from "./security";
import type { User } from "./types";

const SESSION_TOKEN_BYTES = 32;
const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-session" : "session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(token: string): string {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
  const sig = sign(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getDb()
    .collection("sessions")
    .insertOne({
      userId: new ObjectId(userId),
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: new Date(),
    });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${token}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (value) {
    const [token] = value.split(".");
    if (token && /^[a-f\d]{64}$/i.test(token)) {
      await getDb().collection("sessions").deleteMany({ tokenHash: hashToken(token) });
    }
    cookieStore.delete(SESSION_COOKIE);
  }
  // Also clear the pre-hardening cookie name if it is still present.
  if (SESSION_COOKIE !== "session" && cookieStore.has("session")) {
    cookieStore.delete("session");
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value || value.length > 150) return null;
  const [token, sig] = value.split(".");
  if (
    !token ||
    !sig ||
    !/^[a-f\d]{64}$/i.test(token) ||
    !/^[a-f\d]{64}$/i.test(sig) ||
    !signaturesEqual(sig, sign(token))
  ) return null;

  const db = getDb();
  const session = await db
    .collection("sessions")
    .findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;

  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user || user.banned) return null;

  // Throttled last-active update (online indicator)
  const now = Date.now();
  const last = user.lastActive ? new Date(user.lastActive).getTime() : 0;
  if (now - last > 60_000) {
    await db.collection("users").updateOne({ _id: user._id }, { $set: { lastActive: new Date() } });
    user.lastActive = new Date();
  }

  return user as unknown as User;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export function isBanned(user: User | null): boolean {
  return !!user?.banned;
}
