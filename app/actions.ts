"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getDb, ObjectId } from "@/lib/db";
import type { Db } from "mongodb";
import { randomBytes } from "node:crypto";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentUser,
  requireUser,
  requireAdmin,
} from "@/lib/auth";
import { isBlocked, areFriends, notify } from "@/lib/queries";
import { uploadImage, destroyImage } from "@/lib/cloudinary";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/mail";
import { getBulletinFeedPage } from "@/lib/bulletin";
import {
  canAccessChatbox,
  getChatboxById,
  getChatboxMessages,
  toChatboxMessageCard,
} from "@/lib/chatbox";
import { getYouTubeVideoId } from "@/lib/utils";
import {
  REACTION_TYPES,
  type BulletinReaction,
  type BulletinReactionSummary,
  type BulletinVisibility,
  type SerializedBulletinComment,
  type SerializedBulletinPost,
  type ChatboxMessage,
  type ChatboxMessageCard,
  type ChatboxReplyRef,
  type ChatboxVisibility,
  type User,
} from "@/lib/types";

type ActionResult = { ok?: boolean; error?: string };

// ---------------------------------------------------------------- Auth

export async function signupAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const displayName = String(formData.get("displayName") || "").trim();
  const mathFirstRaw = String(formData.get("mathFirst") || "");
  const mathSecondRaw = String(formData.get("mathSecond") || "");
  const mathAnswerRaw = String(formData.get("mathAnswer") || "");
  const mathFirst = Number(mathFirstRaw);
  const mathSecond = Number(mathSecondRaw);
  const mathAnswer = Number(mathAnswerRaw);

  if (
    !mathFirstRaw ||
    !mathSecondRaw ||
    !mathAnswerRaw ||
    !Number.isInteger(mathFirst) ||
    !Number.isInteger(mathSecond) ||
    !Number.isInteger(mathAnswer)
  )
    return { error: "Please solve the math problem." };
  if (mathFirst < 1 || mathFirst > 9 || mathSecond < 1 || mathSecond > 9 || mathAnswer !== mathFirst + mathSecond)
    return { error: "The math answer is incorrect." };
  if (!username || !email || !password) return { error: "All fields are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return { error: "Username must be 3-20 characters (letters, numbers, underscore)." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };

  const db = getDb();
  const existing = await db.collection("users").findOne({ $or: [{ username }, { email }] });
  if (existing)
    return { error: existing.username === username ? "Username is taken." : "Email is already registered." };

  const user: User = {
    _id: new ObjectId(),
    username,
    email,
    passwordHash: hashPassword(password),
    role: "user",
    banned: false,
    emailVerified: false,
    createdAt: new Date(),
    displayName: displayName || username,
    firstName: displayName || username,
    lastName: "",
    gender: "",
    location: "",
    interests: [],
    relationshipStatus: "Single",
    orientation: "",
    zodiac: "",
    bodyType: "",
    occupation: "",
    aboutMe: "",
    hereFor: "",
    whoIdLikeToMeet: "",
    favoriteSong: "",
    mood: "",
    awayMessage: "",
    photo: null,
    theme: { border: "#6699cc", customCss: "" },
    profileViews: 0,
    lastActive: new Date(),
    isPrivate: false,
    hideFromSearch: false,
    whoCanMessage: "everyone",
    whoCanFriendRequest: "everyone",
  };
  const res = await db.collection("users").insertOne(user);

  // Create an email verification token and send a confirmation link. The user
  // cannot log in until they verify their email.
  const token = randomBytes(32).toString("hex");
  await db.collection("emailVerificationTokens").insertOne({
    userId: res.insertedId,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const verifyUrl = `${proto}://${host}/verify-email?token=${token}`;

  try {
    await sendVerificationEmail(user.email, verifyUrl);
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }

  redirect("/login?signup=1");
}

export async function verifyEmailAction(
  token: string
): Promise<ActionResult> {
  const db = getDb();
  const doc = await db.collection("emailVerificationTokens").findOne({ token });
  if (!doc || new Date(doc.expiresAt).getTime() < Date.now())
    return { error: "This verification link is invalid or has expired." };

  const user = await db.collection("users").findOne({ _id: doc.userId });
  if (!user) return { error: "This account is no longer available." };

  await db
    .collection("users")
    .updateOne({ _id: user._id }, { $set: { emailVerified: true } });
  await db
    .collection("emailVerificationTokens")
    .deleteMany({ userId: user._id });
  redirect("/login?verified=1");
}

export async function resendVerificationAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };

  const db = getDb();
  const user = await db.collection("users").findOne({ email });

  if (user && !user.banned && user.emailVerified === false) {
    // Only send one verification email per account per minute to avoid flooding.
    const latest = await db
      .collection("emailVerificationTokens")
      .findOne({ userId: user._id }, { sort: { createdAt: -1 } });
    const lastSentAt = latest ? new Date(latest.createdAt).getTime() : 0;
    if (Date.now() - lastSentAt >= 60_000) {
      const token = randomBytes(32).toString("hex");
      await db
        .collection("emailVerificationTokens")
        .deleteMany({ userId: user._id });
      await db.collection("emailVerificationTokens").insertOne({
        userId: user._id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const h = await headers();
      const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
      const proto =
        h.get("x-forwarded-proto") ||
        (process.env.NODE_ENV === "production" ? "https" : "http");
      const verifyUrl = `${proto}://${host}/verify-email?token=${token}`;

      try {
        await sendVerificationEmail(user.email, verifyUrl);
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    }
  }

  // Always return success so the form doesn't reveal whether an account exists.
  return { ok: true };
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const identifier = String(formData.get("identifier") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!identifier || !password) return { error: "All fields are required." };
  const db = getDb();
  const user = await db
    .collection("users")
    .findOne({ $or: [{ username: identifier }, { email: identifier }] });
  if (!user || !verifyPassword(password, user.passwordHash))
    return { error: "Invalid username/email or password." };
  if (user.banned) return { error: "This account has been suspended." };
  if (user.emailVerified === false)
    return { error: "Please verify your email before logging in. Check your inbox for the confirmation link." };
  await createSession(user._id.toString());
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---------------------------------------------------------------- Password Reset

export async function requestPasswordResetAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };

  const db = getDb();
  const user = await db.collection("users").findOne({ email });

  if (user && !user.banned) {
    // Only send one reset email per account per minute to avoid flooding.
    const latest = await db
      .collection("passwordResetTokens")
      .findOne({ userId: user._id }, { sort: { createdAt: -1 } });
    const lastRequestedAt = latest
      ? new Date(latest.createdAt).getTime()
      : 0;
    if (Date.now() - lastRequestedAt >= 60_000) {
      const token = randomBytes(32).toString("hex");
      await db.collection("passwordResetTokens").deleteMany({ userId: user._id });
      await db.collection("passwordResetTokens").insertOne({
        userId: user._id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const h = await headers();
      const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
      const proto =
        h.get("x-forwarded-proto") ||
        (process.env.NODE_ENV === "production" ? "https" : "http");
      const resetUrl = `${proto}://${host}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }
  }

  // Always return success so the form doesn't reveal whether an account exists.
  return { ok: true };
}

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (!token) return { error: "This reset link is invalid or has expired." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const db = getDb();
  const doc = await db.collection("passwordResetTokens").findOne({ token });
  if (!doc || new Date(doc.expiresAt).getTime() < Date.now())
    return { error: "This reset link is invalid or has expired. Please request a new one." };

  const user = await db.collection("users").findOne({ _id: doc.userId });
  if (!user || user.banned) return { error: "This account is no longer available." };

  await db
    .collection("users")
    .updateOne({ _id: user._id }, { $set: { passwordHash: hashPassword(password) } });
  await db.collection("passwordResetTokens").deleteMany({ userId: user._id });
  await db.collection("sessions").deleteMany({ userId: user._id });
  redirect("/login?reset=1");
}

// ---------------------------------------------------------------- Profile

const PROFILE_FIELDS = [
  "displayName",
  "firstName",
  "lastName",
  "gender",
  "location",
  "relationshipStatus",
  "orientation",
  "zodiac",
  "bodyType",
  "occupation",
  "aboutMe",
  "hereFor",
  "whoIdLikeToMeet",
  "favoriteSong",
  "mood",
  "awayMessage",
] as const;

export async function updateProfileAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const patch: Record<string, unknown> = {};
  for (const f of PROFILE_FIELDS) {
    patch[f] = String(formData.get(f) || "").trim();
  }
  patch.interests = String(formData.get("interests") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  patch.isPrivate = formData.get("isPrivate") === "on";
  patch.hideFromSearch = formData.get("hideFromSearch") === "on";
  patch.whoCanMessage = String(formData.get("whoCanMessage") || "everyone");
  patch.whoCanFriendRequest = String(formData.get("whoCanFriendRequest") || "everyone");

  await getDb().collection("users").updateOne({ _id: user._id }, { $set: patch });
  revalidatePath(`/${user.username}`);
  revalidatePath("/edit");
  return { ok: true };
}

export async function uploadPhotoAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected." };
  if (file.size > 3 * 1024 * 1024) return { error: "Image must be under 3MB." };
  if (!file.type.startsWith("image/")) return { error: "Please upload an image file." };
  const buf = Buffer.from(await file.arrayBuffer());
  let uploaded;
  try {
    uploaded = await uploadImage(buf, `profiles/${user.username}`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Unknown Cloudinary error.";
    console.error("Profile image upload failed:", message);
    return {
      error:
        process.env.NODE_ENV === "development"
          ? `Image upload failed: ${message}`
          : "Image upload failed. Please try again.",
    };
  }
  await getDb().collection("users").updateOne(
    { _id: user._id },
    { $set: { photo: uploaded.secure_url, photoPublicId: uploaded.public_id } }
  );
  revalidatePath(`/${user.username}`);
  revalidatePath("/edit");
  return { ok: true };
}

export async function removePhotoAction(): Promise<ActionResult> {
  const user = await requireUser();
  if (user.photoPublicId) {
    await destroyImage(user.photoPublicId).catch(() => {});
  }
  await getDb().collection("users").updateOne(
    { _id: user._id },
    { $set: { photo: null, photoPublicId: null } }
  );
  revalidatePath(`/${user.username}`);
  revalidatePath("/edit");
  return { ok: true };
}

export async function updateThemeAction(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();
  const youtubeUrl = String(formData.get("youtubeUrl") || "").trim().slice(0, 500);
  const youtubeVideoId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : "";
  if (youtubeUrl && !youtubeVideoId) {
    return { error: "Please enter a valid YouTube video link." };
  }
  const theme = {
    border: String(formData.get("border") || "#6699cc"),
    customCss: String(formData.get("customCss") || "").trim().slice(0, 12000),
    youtubeVideoId,
  };
  await getDb().collection("users").updateOne({ _id: user._id }, { $set: { theme } });
  revalidatePath(`/${user.username}`);
  revalidatePath("/edit");
  return { ok: true };
}

export async function updatePrivacyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await getDb().collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        isPrivate: formData.get("isPrivate") === "on",
        hideFromSearch: formData.get("hideFromSearch") === "on",
        whoCanMessage: String(formData.get("whoCanMessage") || "everyone"),
        whoCanFriendRequest: String(formData.get("whoCanFriendRequest") || "everyone"),
      },
    }
  );
  revalidatePath(`/${user.username}`);
  revalidatePath("/edit");
}

export async function incrementProfileViewAction(username: string): Promise<ActionResult> {
  const db = getDb();
  const user = await db.collection("users").findOne({ username });
  if (!user) return { error: "User not found." };
  const current = await getCurrentUser();
  if (current && current._id.toString() === user._id.toString()) return { ok: true };
  await db.collection("users").updateOne({ _id: user._id }, { $inc: { profileViews: 1 } });
  revalidatePath(`/${username}`);
  return { ok: true };
}

// ---------------------------------------------------------------- Friends

export async function sendFriendRequestAction(targetId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user._id.toString() === targetId) return { error: "You cannot add yourself." };
  const db = getDb();
  const target = await db.collection("users").findOne({ _id: new ObjectId(targetId) });
  if (!target) return { error: "User not found." };
  if (await isBlocked(targetId, user._id.toString())) return { error: "You are blocked by this user." };
  if (target.whoCanFriendRequest === "nobody")
    return { error: "This user is not accepting friend requests." };
  const existing = await db.collection("friendships").findOne({
    $or: [
      { requesterId: user._id, addresseeId: new ObjectId(targetId) },
      { requesterId: new ObjectId(targetId), addresseeId: user._id },
    ],
  });
  if (existing)
    return { error: existing.status === "pending" ? "Request already pending." : "You are already friends." };
  await db.collection("friendships").insertOne({
    requesterId: user._id,
    addresseeId: new ObjectId(targetId),
    status: "pending",
    createdAt: new Date(),
    respondedAt: null,
  });
  await notify(
    targetId,
    "friend_request",
    user._id.toString(),
    `${user.displayName} sent you a friend request.`,
    "/friends"
  );
  revalidatePath(`/${target.username}`);
  revalidatePath("/friends");
  return { ok: true };
}

export async function respondFriendRequestAction(
  friendshipId: string,
  accept: boolean
): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const f = await db.collection("friendships").findOne({
    _id: new ObjectId(friendshipId),
    addresseeId: user._id,
    status: "pending",
  });
  if (!f) return { error: "Request not found." };
  if (accept) {
    await db
      .collection("friendships")
      .updateOne({ _id: f._id }, { $set: { status: "approved", respondedAt: new Date() } });
    await notify(
      f.requesterId.toString(),
      "friend_accepted",
      user._id.toString(),
      `${user.displayName} accepted your friend request.`,
      `/${user.username}`
    );
  } else {
    await db.collection("friendships").deleteOne({ _id: f._id });
  }
  revalidatePath("/friends");
  return { ok: true };
}

export async function removeFriendAction(friendshipId: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const f = await db.collection("friendships").findOne({
    _id: new ObjectId(friendshipId),
    status: "approved",
    $or: [{ requesterId: user._id }, { addresseeId: user._id }],
  });
  if (!f) return { error: "Friendship not found." };
  await db.collection("friendships").deleteOne({ _id: f._id });
  revalidatePath("/friends");
  return { ok: true };
}

// ---------------------------------------------------------------- Messages

export async function sendMessageAction(
  recipientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  if (!body) return { error: "Message cannot be empty." };
  if (user._id.toString() === recipientId) return { error: "You cannot message yourself." };
  const db = getDb();
  const recipient = await db.collection("users").findOne({ _id: new ObjectId(recipientId) });
  if (!recipient) return { error: "User not found." };
  const canMessage =
    recipient.whoCanMessage === "everyone" ||
    (recipient.whoCanMessage === "friends" && (await areFriends(user._id.toString(), recipientId)));
  if (!canMessage) return { error: "This user is not accepting messages." };
  if (await isBlocked(recipientId, user._id.toString())) return { error: "You are blocked by this user." };
  await db.collection("messages").insertOne({
    senderId: user._id,
    recipientId: new ObjectId(recipientId),
    subject,
    body,
    read: false,
    createdAt: new Date(),
  });
  await notify(
    recipientId,
    "message",
    user._id.toString(),
    `New message from ${user.displayName}.`,
    "/messages"
  );
  revalidatePath("/messages");
  revalidatePath(`/messages/${recipientId}`);
  return { ok: true };
}

export async function markMessageReadAction(messageId: string): Promise<ActionResult> {
  const user = await requireUser();
  await getDb()
    .collection("messages")
    .updateOne({ _id: new ObjectId(messageId), recipientId: user._id }, { $set: { read: true } });
  revalidatePath("/messages");
  return { ok: true };
}

export async function deleteMessageAction(messageId: string): Promise<ActionResult> {
  const user = await requireUser();
  await getDb()
    .collection("messages")
    .deleteOne({ _id: new ObjectId(messageId), $or: [{ senderId: user._id }, { recipientId: user._id }] });
  revalidatePath("/messages");
  return { ok: true };
}

// ---------------------------------------------------------------- Testimonials

export async function writeTestimonialAction(
  profileId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Testimonial cannot be empty." };
  const db = getDb();
  const profile = await db.collection("users").findOne({ _id: new ObjectId(profileId) });
  if (!profile) return { error: "User not found." };
  if (await isBlocked(profileId, user._id.toString())) return { error: "You are blocked by this user." };
  const isOwner = profile._id.toString() === user._id.toString();
  const status = isOwner ? "approved" : "pending";
  await db.collection("testimonials").insertOne({
    authorId: user._id,
    profileId: new ObjectId(profileId),
    body,
    status,
    createdAt: new Date(),
  });
  if (!isOwner)
    await notify(
      profileId,
      "testimonial",
      user._id.toString(),
      `${user.displayName} wrote you a testimonial.`,
      `/${profile.username}`
    );
  revalidatePath(`/${profile.username}`);
  return { ok: true };
}

export async function approveTestimonialAction(testimonialId: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const t = await db
    .collection("testimonials")
    .findOne({ _id: new ObjectId(testimonialId), profileId: user._id });
  if (!t) return { error: "Testimonial not found." };
  await db.collection("testimonials").updateOne({ _id: t._id }, { $set: { status: "approved" } });
  revalidatePath(`/${user.username}`);
  return { ok: true };
}

export async function deleteTestimonialAction(testimonialId: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const t = await db.collection("testimonials").findOne({ _id: new ObjectId(testimonialId) });
  if (!t) return { error: "Testimonial not found." };
  const isOwner = t.profileId.toString() === user._id.toString();
  const isAuthor = t.authorId.toString() === user._id.toString();
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAuthor && !isAdmin) return { error: "Not allowed." };
  await db.collection("testimonials").deleteOne({ _id: t._id });
  revalidatePath(`/${user.username}`);
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------- Bulletin Board

const BULLETIN_VISIBILITIES: BulletinVisibility[] = ["public", "friends", "private"];

export async function createBulletinPostAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  const visibilityValue = String(formData.get("visibility") || "public") as BulletinVisibility;
  if (!body) return { error: "Your post cannot be empty." };
  if (body.length > 1000) return { error: "Posts must be 1,000 characters or fewer." };
  if (!BULLETIN_VISIBILITIES.includes(visibilityValue)) return { error: "Invalid post visibility." };

  // Enforce the admin-configured per-hour posting limit.
  const bulletinSetting = await getDb().collection("settings").findOne({ key: "bulletin" });
  const postsPerHour = bulletinSetting?.maxBulletinPostsPerHour as number | null | undefined;
  if (postsPerHour && postsPerHour > 0) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await getDb()
      .collection("bulletinPosts")
      .countDocuments({ authorId: user._id, createdAt: { $gt: since } });
    if (recentCount >= postsPerHour) {
      return {
        error: `You've reached the limit of ${postsPerHour} bulletin post${postsPerHour === 1 ? "" : "s"} per hour. Please try again later.`,
      };
    }
  }

  const file = formData.get("photo");
  let uploaded: { secure_url: string; public_id: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) return { error: "Image must be under 3MB." };
    if (!file.type.startsWith("image/")) return { error: "Please upload an image file." };
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      uploaded = await uploadImage(buf, `bulletin-posts/${user.username}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "Unknown Cloudinary error.";
      console.error("Bulletin image upload failed:", message);
      return {
        error:
          process.env.NODE_ENV === "development"
            ? `Image upload failed: ${message}`
            : "Image upload failed. Please try again.",
      };
    }
  }

  await getDb().collection("bulletinPosts").insertOne({
    authorId: user._id,
    body,
    visibility: visibilityValue,
    photo: uploaded?.secure_url ?? null,
    photoPublicId: uploaded?.public_id ?? null,
    createdAt: new Date(),
  });
  revalidatePath("/");
  revalidatePath(`/${user.username}`);
  return { ok: true };
}

export async function reactToBulletinPostAction(
  postId: string,
  type: string
): Promise<ActionResult & {
  reactions?: BulletinReactionSummary[];
  myReaction?: string | null;
}> {
  const user = await requireUser();
  const db = getDb();
  let oid;
  try {
    oid = new ObjectId(postId);
  } catch {
    return { error: "Post not found." };
  }
  const post = await db.collection("bulletinPosts").findOne({ _id: oid });
  if (!post) return { error: "Post not found." };
  if (!(REACTION_TYPES as readonly string[]).includes(type))
    return { error: "Invalid reaction." };

  const existing = await db
    .collection("bulletinReactions")
    .findOne({ postId: oid, userId: user._id });
  const created = !existing;
  if (existing && existing.type === type) {
    await db.collection("bulletinReactions").deleteOne({ _id: existing._id });
  } else if (existing) {
    await db.collection("bulletinReactions").updateOne({ _id: existing._id }, { $set: { type } });
  } else {
    await db.collection("bulletinReactions").insertOne({
      postId: oid,
      userId: user._id,
      type,
      createdAt: new Date(),
    });
  }

  if (created) {
    const author = await db.collection("users").findOne({ _id: post.authorId });
    if (author && author._id.toString() !== user._id.toString()) {
      await notify(
        author._id.toString(),
        "bulletin_reaction",
        user._id.toString(),
        `${user.displayName} reacted ${type} to your bulletin post.`,
        `/bulletin/${postId}`
      );
    }
  }

  const reactions = (await db
    .collection("bulletinReactions")
    .find({ postId: oid })
    .toArray()) as unknown as BulletinReaction[];
  const counts = new Map<string, number>();
  let myReaction: string | null = null;
  for (const r of reactions) {
    counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
    if (r.userId.toString() === user._id.toString()) myReaction = r.type;
  }

  revalidatePath("/");
  revalidatePath(`/bulletin/${postId}`);
  const author = await db.collection("users").findOne({ _id: post.authorId });
  if (author) revalidatePath(`/${author.username}`);

  return {
    ok: true,
    reactions: [...counts.entries()]
      .map(([t, c]) => ({ type: t, count: c }))
      .sort((a, b) => b.count - a.count),
    myReaction,
  };
}

export async function getMoreBulletinPostsAction(
  cursor: { createdAt: string; _id: string } | null
): Promise<{
  posts: SerializedBulletinPost[];
  nextCursor: { createdAt: string; _id: string } | null;
}> {
  const user = await requireUser();
  return getBulletinFeedPage(user._id.toString(), cursor);
}

export async function deleteBulletinPostAction(postId: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const post = await db
    .collection("bulletinPosts")
    .findOne({ _id: new ObjectId(postId) });
  if (!post) return { error: "Post not found." };

  const isAuthor = post.authorId.toString() === user._id.toString();
  if (!isAuthor && user.username !== "genggengpro")
    return { error: "Not allowed." };

  if (post.photoPublicId) {
    await destroyImage(post.photoPublicId).catch(() => {});
  }
  await db.collection("bulletinPosts").deleteOne({ _id: post._id });
  await db.collection("bulletinComments").deleteMany({ postId: post._id });
  revalidatePath("/");
  const author = await db.collection("users").findOne({ _id: post.authorId });
  if (author) revalidatePath(`/${author.username}`);
  return { ok: true };
}

export async function createBulletinCommentAction(
  postId: string,
  formData: FormData
): Promise<ActionResult & { comment?: SerializedBulletinComment }> {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Comment cannot be empty." };
  if (body.length > 500) return { error: "Comments must be 500 characters or fewer." };

  const db = getDb();
  const post = await db.collection("bulletinPosts").findOne({ _id: new ObjectId(postId) });
  if (!post) return { error: "Post not found." };

  const createdAt = new Date();
  const inserted = await db.collection("bulletinComments").insertOne({
    postId: post._id,
    authorId: user._id,
    body,
    createdAt,
  });

  const author = await db.collection("users").findOne({ _id: post.authorId });
  if (author && author._id.toString() !== user._id.toString()) {
    await notify(
      author._id.toString(),
      "bulletin_comment",
      user._id.toString(),
      `${user.displayName} commented on your bulletin post.`,
      `/bulletin/${postId}`
    );
  }

  revalidatePath("/");
  if (author) revalidatePath(`/${author.username}`);
  revalidatePath(`/bulletin/${postId}`);

  return {
    ok: true,
    comment: {
      _id: inserted.insertedId.toString(),
      postId: post._id.toString(),
      authorId: user._id.toString(),
      body,
      createdAt: createdAt.toISOString(),
      author: {
        _id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        photo: user.photo,
      },
    },
  };
}

export async function deleteBulletinCommentAction(commentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const comment = await db
    .collection("bulletinComments")
    .findOne({ _id: new ObjectId(commentId) });
  if (!comment) return { error: "Comment not found." };

  const post = await db.collection("bulletinPosts").findOne({ _id: comment.postId });
  const isCommentAuthor = comment.authorId.toString() === user._id.toString();
  const isPostAuthor = post ? post.authorId.toString() === user._id.toString() : false;
  if (!isCommentAuthor && !isPostAuthor && user.role !== "admin" && user.username !== "genggengpro")
    return { error: "Not allowed." };

  await db.collection("bulletinComments").deleteOne({ _id: comment._id });
  revalidatePath("/");
  if (post) {
    const author = await db.collection("users").findOne({ _id: post.authorId });
    if (author) revalidatePath(`/${author.username}`);
  }
  return { ok: true };
}

// ---------------------------------------------------------------- Interactions

export async function pokeAction(targetId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user._id.toString() === targetId) return { error: "You cannot poke yourself." };
  const db = getDb();
  const target = await db.collection("users").findOne({ _id: new ObjectId(targetId) });
  if (!target) return { error: "User not found." };
  if (await isBlocked(targetId, user._id.toString())) return { error: "You are blocked by this user." };
  await db.collection("pokes").insertOne({
    fromId: user._id,
    toId: new ObjectId(targetId),
    createdAt: new Date(),
  });
  await notify(
    targetId,
    "poke",
    user._id.toString(),
    `${user.displayName} poked you!`,
    `/${target.username}`
  );
  revalidatePath(`/${target.username}`);
  return { ok: true };
}

export async function blockUserAction(targetId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user._id.toString() === targetId) return { error: "You cannot block yourself." };
  const db = getDb();
  await db
    .collection("blocks")
    .updateOne(
      { blockerId: user._id, blockedId: new ObjectId(targetId) },
      { $setOnInsert: { blockerId: user._id, blockedId: new ObjectId(targetId), createdAt: new Date() } },
      { upsert: true }
    );
  await db.collection("friendships").deleteMany({
    $or: [
      { requesterId: user._id, addresseeId: new ObjectId(targetId) },
      { requesterId: new ObjectId(targetId), addresseeId: user._id },
    ],
  });
  revalidatePath(`/${targetId}`);
  revalidatePath("/friends");
  return { ok: true };
}

export async function unblockUserAction(targetId: string): Promise<ActionResult> {
  const user = await requireUser();
  await getDb()
    .collection("blocks")
    .deleteOne({ blockerId: user._id, blockedId: new ObjectId(targetId) });
  revalidatePath(`/${targetId}`);
  return { ok: true };
}

export async function reportUserAction(
  targetId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const reason = String(formData.get("reason") || "").trim() || "Reported user";
  await getDb().collection("reports").insertOne({
    reporterId: user._id,
    reportedId: new ObjectId(targetId),
    type: "user",
    reason,
    status: "open",
    createdAt: new Date(),
  });
  return { ok: true };
}

// ---------------------------------------------------------------- Notifications

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const acknowledgedAt = new Date();
  await db
    .collection("notifications")
    .updateOne(
      { _id: new ObjectId(notificationId), userId: user._id },
      { $set: { read: true } }
    );
  await db
    .collection("users")
    .updateOne({ _id: user._id }, { $set: { notificationAcknowledgedAt: acknowledgedAt } });
  revalidatePath("/notifications");
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------- Admin

export async function adminSetBannedAction(targetId: string, banned: boolean): Promise<ActionResult> {
  await requireAdmin();
  await getDb().collection("users").updateOne({ _id: new ObjectId(targetId) }, { $set: { banned } });
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminSetRoleAction(targetId: string, role: string): Promise<ActionResult> {
  await requireAdmin();
  await getDb().collection("users").updateOne({ _id: new ObjectId(targetId) }, { $set: { role } });
  revalidatePath("/admin");
  return { ok: true };
}

// Deletes the user and every document referencing them across all collections.
async function deleteAllUserData(db: Db, oid: ObjectId): Promise<void> {
  const userPosts = (await db
    .collection("bulletinPosts")
    .find({ authorId: oid })
    .project({ _id: 1, photoPublicId: 1 })
    .toArray()) as unknown as { _id: ObjectId; photoPublicId?: string | null }[];
  const postIds = userPosts.map((p) => p._id);

  const ownedChatboxes = (await db
    .collection("chatboxes")
    .find({ createdBy: oid })
    .project({ _id: 1 })
    .toArray()) as unknown as { _id: ObjectId }[];
  const chatboxIds = ownedChatboxes.map((c) => c._id);

  await db.collection("users").deleteOne({ _id: oid });
  await Promise.all([
    ...userPosts
      .filter((p) => p.photoPublicId)
      .map((p) => destroyImage(p.photoPublicId as string).catch(() => {})),
    db.collection("sessions").deleteMany({ userId: oid }),
    db.collection("emailVerificationTokens").deleteMany({ userId: oid }),
    db
      .collection("friendships")
      .deleteMany({ $or: [{ requesterId: oid }, { addresseeId: oid }] }),
    db.collection("messages").deleteMany({ $or: [{ senderId: oid }, { recipientId: oid }] }),
    db.collection("bulletinPosts").deleteMany({ authorId: oid }),
    db.collection("bulletinReactions").deleteMany({
      $or: [{ userId: oid }, ...(postIds.length > 0 ? [{ postId: { $in: postIds } }] : [])],
    }),
    db.collection("bulletinComments").deleteMany({
      $or: [{ authorId: oid }, ...(postIds.length > 0 ? [{ postId: { $in: postIds } }] : [])],
    }),
    db
      .collection("testimonials")
      .deleteMany({ $or: [{ authorId: oid }, { profileId: oid }] }),
    db
      .collection("notifications")
      .deleteMany({ $or: [{ userId: oid }, { actorId: oid }] }),
    db.collection("reports").deleteMany({ $or: [{ reporterId: oid }, { reportedId: oid }] }),
    db.collection("blocks").deleteMany({ $or: [{ blockerId: oid }, { blockedId: oid }] }),
    db.collection("pokes").deleteMany({ $or: [{ fromId: oid }, { toId: oid }] }),
    db.collection("chatboxes").deleteMany({ createdBy: oid }),
    db.collection("chatboxMessages").deleteMany({
      $or: [{ senderId: oid }, ...(chatboxIds.length > 0 ? [{ chatboxId: { $in: chatboxIds } }] : [])],
    }),
    db.collection("bugReports").deleteMany({ userId: oid }),
  ]);
}

export async function adminDeleteUserAction(targetId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin._id.toString() === targetId) return { error: "You cannot delete yourself." };
  await deleteAllUserData(getDb(), new ObjectId(targetId));
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminSetBulletinPostLimitAction(limitValue: string): Promise<ActionResult> {
  await requireAdmin();
  const raw = String(limitValue || "").trim();
  let limit: number | null = null;
  if (raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 1000)
      return { error: "Limit must be a whole number between 0 and 1000." };
    limit = Math.floor(n);
  }
  await getDb().collection("settings").updateOne(
    { key: "bulletin" },
    {
      $set: {
        maxBulletinPostsPerHour: limit === 0 ? null : limit,
        updatedAt: new Date(),
      },
      $setOnInsert: { key: "bulletin" },
    },
    { upsert: true }
  );
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminDeleteUserByIdAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = userId.trim();
  if (!id) return { error: "Please enter a user ID." };
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return { error: "That doesn't look like a valid user ID." };
  }
  if (admin._id.toString() === oid.toString()) return { error: "You cannot delete yourself." };
  const user = await getDb().collection("users").findOne({ _id: oid });
  if (!user) return { error: "No user found with that ID." };
  await deleteAllUserData(getDb(), oid);
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminReviewReportAction(
  reportId: string,
  resolution: string
): Promise<ActionResult> {
  await requireAdmin();
  await getDb()
    .collection("reports")
    .updateOne({ _id: new ObjectId(reportId) }, { $set: { status: resolution } });
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------- Chatboxes

export async function createChatboxAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const visibilityValue = String(formData.get("visibility") || "public") as ChatboxVisibility;
  if (!name) return { error: "Please give your chatbox a name." };
  if (name.length > 60) return { error: "Chatbox name must be 60 characters or fewer." };
  if (!["public", "friends"].includes(visibilityValue)) return { error: "Invalid chatbox visibility." };

  await getDb().collection("chatboxes").insertOne({
    name,
    createdBy: user._id,
    visibility: visibilityValue,
    createdAt: new Date(),
  });
  revalidatePath("/chatboxes");
  return { ok: true };
}

export async function sendChatboxMessageAction(
  chatboxId: string,
  replyToId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult & { message?: ChatboxMessageCard }> {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Message cannot be empty." };
  if (body.length > 2000) return { error: "Message must be 2,000 characters or fewer." };

  const chatbox = await getChatboxById(chatboxId);
  if (!chatbox) return { error: "Chatbox not found." };
  if (!(await canAccessChatbox(chatbox, user._id.toString())))
    return { error: "You don't have access to this chatbox." };

  const db = getDb();
  const createdAt = new Date();
  const messageDoc: ChatboxMessage = {
    _id: new ObjectId(),
    chatboxId: chatbox._id,
    senderId: user._id,
    body,
    createdAt,
  };

  // If the sender is replying to an earlier message, snapshot its author and
  // body so the reply renders even when the original is no longer loaded.
  let replyTo: ChatboxReplyRef | undefined;
  if (replyToId) {
    let replyOid: ObjectId | null = null;
    try {
      replyOid = new ObjectId(replyToId);
    } catch {
      replyOid = null;
    }
    if (replyOid) {
      const target = await db
        .collection("chatboxMessages")
        .findOne({ _id: replyOid, chatboxId: chatbox._id });
      if (target) {
        const replyAuthor = await db
          .collection("users")
          .findOne({ _id: target.senderId });
        replyTo = {
          messageId: target._id.toString(),
          authorId: target.senderId.toString(),
          authorDisplayName: replyAuthor?.displayName ?? "Unknown",
          authorUsername: replyAuthor?.username ?? "unknown",
          body: target.body,
        };
        messageDoc.replyTo = replyTo;
      }
    }
  }

  const inserted = await db.collection("chatboxMessages").insertOne(messageDoc);
  revalidatePath(`/chatboxes/${chatboxId}`);
  return {
    ok: true,
    message: {
      _id: inserted.insertedId.toString(),
      chatboxId: chatbox._id.toString(),
      senderId: user._id.toString(),
      body,
      createdAt: createdAt.toISOString(),
      author: {
        _id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        photo: user.photo,
      },
      ...(replyTo ? { replyTo } : {}),
    },
  };
}

export async function getChatboxMessagesAction(
  chatboxId: string,
): Promise<{ messages: ChatboxMessageCard[] }> {
  const user = await requireUser();
  const chatbox = await getChatboxById(chatboxId);
  if (!chatbox) return { messages: [] };
  if (!(await canAccessChatbox(chatbox, user._id.toString())))
    return { messages: [] };
  const messages = await getChatboxMessages(chatbox._id);
  return { messages: messages.map(toChatboxMessageCard) };
}

export async function deleteChatboxAction(chatboxId: string): Promise<ActionResult> {
  const user = await requireUser();
  const chatbox = await getChatboxById(chatboxId);
  if (!chatbox) return { error: "Chatbox not found." };
  if (chatbox.createdBy.toString() !== user._id.toString() && user.username !== "genggengpro")
    return { error: "Not allowed." };
  await getDb().collection("chatboxes").deleteOne({ _id: chatbox._id });
  await getDb().collection("chatboxMessages").deleteMany({ chatboxId: chatbox._id });
  revalidatePath("/chatboxes");
  redirect("/chatboxes");
}

// ---------------------------------------------------------------- Bug Reports

export async function reportBugAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Please describe the bug." };
  if (body.length > 2000) return { error: "Bug report must be 2,000 characters or fewer." };

  const user = await getCurrentUser();
  await getDb().collection("bugReports").insertOne({
    userId: user?._id ?? null,
    body,
    status: "open",
    done: false,
    createdAt: new Date(),
  });
  return { ok: true };
}

export async function toggleBugReportDoneAction(reportId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.username !== "genggengpro") return { error: "Not allowed." };
  const db = getDb();
  const report = await db
    .collection("bugReports")
    .findOne({ _id: new ObjectId(reportId) });
  if (!report) return { error: "Report not found." };
  await db
    .collection("bugReports")
    .updateOne({ _id: report._id }, { $set: { done: !report.done } });
  revalidatePath("/report-bug");
  return { ok: true };
}

export async function deleteBugReportAction(reportId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.username !== "genggengpro") return { error: "Not allowed." };
  await getDb()
    .collection("bugReports")
    .deleteOne({ _id: new ObjectId(reportId) });
  revalidatePath("/report-bug");
  return { ok: true };
}
