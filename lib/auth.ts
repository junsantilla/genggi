import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHmac, timingSafeEqual, scryptSync } from "node:crypto";
import { getDb, ObjectId } from "./db";
import { DEV_PROXY, genggiAuthCreate, genggiAuthDestroy, genggiAuthVerify } from "./genggi";
import type { User } from "./types";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const SESSION_COOKIE = "session";
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
  return createHmac("sha256", SECRET).update(token).digest("hex");
}

const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Creates a session row and returns the opaque cookie value (`token.sig`).
 * Used by createSession locally and by the internal auth route on the
 * production API when the dev server asks it to log a user in.
 */
export async function createSessionToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const sig = sign(token);
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await getDb()
    .collection("sessions")
    .insertOne({
      userId: new ObjectId(userId),
      token,
      sig,
      expiresAt,
      createdAt: new Date(),
    });
  return `${token}.${sig}`;
}

/** Deletes the session row(s) backing a cookie value. */
export async function destroySessionCookie(cookieValue: string): Promise<void> {
  const [token] = cookieValue.split(".");
  if (token) await getDb().collection("sessions").deleteMany({ token });
}

/**
 * Verifies a cookie value's signature, looks up the session, and returns the
 * user (with a throttled last-active update). Returns null when the cookie is
 * invalid, expired, or has no user.
 */
export async function getUserByCookie(cookieValue: string): Promise<User | null> {
  const [token, sig] = cookieValue.split(".");
  if (!token || !sig || sig !== sign(token)) return null;
  const db = getDb();
  const session = await db
    .collection("sessions")
    .findOne({ token, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user) return null;
  const now = Date.now();
  const last = user.lastActive ? new Date(user.lastActive).getTime() : 0;
  if (now - last > 60_000) {
    await db.collection("users").updateOne({ _id: user._id }, { $set: { lastActive: new Date() } });
    user.lastActive = new Date();
  }
  return user as unknown as User;
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const cookieValue = DEV_PROXY
    ? (await genggiAuthCreate(userId)).cookie
    : await createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return;
  if (DEV_PROXY) await genggiAuthDestroy(value);
  else await destroySessionCookie(value);
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  if (DEV_PROXY) {
    // The production AUTH_SECRET signed the cookie, so the dev server cannot
    // verify it locally. Delegate to the API, which returns the user doc.
    return ((await genggiAuthVerify(value)) as User | null) ?? null;
  }
  return getUserByCookie(value);
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
