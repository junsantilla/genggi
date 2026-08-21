"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, ObjectId } from "@/lib/db";
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
import { getBulletinFeedPage } from "@/lib/bulletin";
import type { BulletinVisibility, SerializedBulletinPost, User } from "@/lib/types";

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
  await createSession(res.insertedId.toString());
  redirect(`/u/${username}`);
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
  await createSession(user._id.toString());
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
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
  revalidatePath(`/u/${user.username}`);
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
  revalidatePath(`/u/${user.username}`);
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
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/edit");
  return { ok: true };
}

export async function updateThemeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const theme = {
    border: String(formData.get("border") || "#6699cc"),
    customCss: String(formData.get("customCss") || "").trim().slice(0, 12000),
  };
  await getDb().collection("users").updateOne({ _id: user._id }, { $set: { theme } });
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/edit");
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
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/edit");
}

export async function incrementProfileViewAction(username: string): Promise<ActionResult> {
  const db = getDb();
  const user = await db.collection("users").findOne({ username });
  if (!user) return { error: "User not found." };
  const current = await getCurrentUser();
  if (current && current._id.toString() === user._id.toString()) return { ok: true };
  await db.collection("users").updateOne({ _id: user._id }, { $inc: { profileViews: 1 } });
  revalidatePath(`/u/${username}`);
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
  revalidatePath(`/u/${target.username}`);
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
      `/u/${user.username}`
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
      `/u/${profile.username}`
    );
  revalidatePath(`/u/${profile.username}`);
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
  revalidatePath(`/u/${user.username}`);
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
  revalidatePath(`/u/${user.username}`);
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
  revalidatePath(`/u/${user.username}`);
  return { ok: true };
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
  if (author) revalidatePath(`/u/${author.username}`);
  return { ok: true };
}

export async function createBulletinCommentAction(
  postId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Comment cannot be empty." };
  if (body.length > 500) return { error: "Comments must be 500 characters or fewer." };

  const db = getDb();
  const post = await db.collection("bulletinPosts").findOne({ _id: new ObjectId(postId) });
  if (!post) return { error: "Post not found." };

  await db.collection("bulletinComments").insertOne({
    postId: post._id,
    authorId: user._id,
    body,
    createdAt: new Date(),
  });

  const author = await db.collection("users").findOne({ _id: post.authorId });
  if (author && author._id.toString() !== user._id.toString()) {
    await notify(
      author._id.toString(),
      "bulletin_comment",
      user._id.toString(),
      `${user.displayName} commented on your bulletin post.`,
      "/"
    );
  }

  revalidatePath("/");
  if (author) revalidatePath(`/u/${author.username}`);
  return { ok: true };
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
  if (!isCommentAuthor && !isPostAuthor && user.role !== "admin")
    return { error: "Not allowed." };

  await db.collection("bulletinComments").deleteOne({ _id: comment._id });
  revalidatePath("/");
  if (post) {
    const author = await db.collection("users").findOne({ _id: post.authorId });
    if (author) revalidatePath(`/u/${author.username}`);
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
    `/u/${target.username}`
  );
  revalidatePath(`/u/${target.username}`);
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
  revalidatePath(`/u/${targetId}`);
  revalidatePath("/friends");
  return { ok: true };
}

export async function unblockUserAction(targetId: string): Promise<ActionResult> {
  const user = await requireUser();
  await getDb()
    .collection("blocks")
    .deleteOne({ blockerId: user._id, blockedId: new ObjectId(targetId) });
  revalidatePath(`/u/${targetId}`);
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

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await getDb()
    .collection("notifications")
    .updateMany({ userId: user._id, read: false }, { $set: { read: true } });
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

export async function adminDeleteUserAction(targetId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin._id.toString() === targetId) return { error: "You cannot delete yourself." };
  const db = getDb();
  const oid = new ObjectId(targetId);
  const userPosts = (await db
    .collection("bulletinPosts")
    .find({ authorId: oid })
    .project({ photoPublicId: 1 })
    .toArray()) as unknown as { photoPublicId?: string | null }[];
  await db.collection("users").deleteOne({ _id: oid });
  await Promise.all([
    ...userPosts
      .filter((p) => p.photoPublicId)
      .map((p) => destroyImage(p.photoPublicId as string).catch(() => {})),
    db.collection("sessions").deleteMany({ userId: oid }),
    db
      .collection("friendships")
      .deleteMany({ $or: [{ requesterId: oid }, { addresseeId: oid }] }),
    db.collection("messages").deleteMany({ $or: [{ senderId: oid }, { recipientId: oid }] }),
    db.collection("bulletinPosts").deleteMany({ authorId: oid }),
    db
      .collection("testimonials")
      .deleteMany({ $or: [{ authorId: oid }, { profileId: oid }] }),
    db.collection("notifications").deleteMany({ userId: oid }),
  ]);
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
    createdAt: new Date(),
  });
  return { ok: true };
}
