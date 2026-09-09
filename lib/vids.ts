import { getDb, ObjectId } from "@/lib/db";
import type {
  SerializedVid,
  SerializedVidComment,
  Vid,
  VidAuthorCard,
  VidComment,
  VidFeedPage,
} from "@/lib/types";
import { deleteObject } from "@/lib/r2";
import { createHmac } from "node:crypto";

// ------------------------------------------------------------------ Config

export const VID_PAGE_SIZE = 5;
export const VID_COMMENT_PAGE_SIZE = 20;
export const VID_MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
export const VID_MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024; // 2 MB
export const VID_MAX_CAPTION_LENGTH = 500;
export const VID_MAX_HASHTAGS = 10;
export const VID_MAX_HASHTAG_LENGTH = 30;
export const VID_MAX_DURATION_SECONDS = 3600;
export const VID_MAX_UPLOADS_PER_HOUR = 10;
export const VID_MAX_IN_PROGRESS = 3;
export const VID_COMMENTS_PER_HOUR = 30;
export const VID_ABANDONED_AGE_MS = 24 * 60 * 60 * 1000; // cleanup cutoff

// MIME types and extensions the server accepts. The client validates the same
// rules before uploading; the server never trusts the client alone.
export const VID_ALLOWED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

export const VID_ALLOWED_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv"]);

export const VID_THUMBNAIL_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function vidVideoKey(userId: string, vidId: string): string {
  return `vids/${userId}/${vidId}/video.mp4`;
}

export function vidThumbnailKey(userId: string, vidId: string): string {
  return `vids/${userId}/${vidId}/thumbnail.jpg`;
}

// ---------------------------------------------------------------- Indexes

let indexesEnsured = false;

// Idempotent index setup. createIndex with the same specification is a no-op
// on subsequent runs, so this is safe to call from request handlers. Runs once
// per process thanks to the memoized flag.
export async function ensureVidIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = getDb();
  await Promise.all([
    db.collection("vids").createIndex({ status: 1, createdAt: -1, _id: -1 }),
    db
      .collection("vids")
      .createIndex({ userId: 1, status: 1, createdAt: -1, _id: -1 }),
    db
      .collection("vidLikes")
      .createIndex({ vidId: 1, userId: 1 }, { unique: true }),
    db
      .collection("vidViews")
      .createIndex({ vidId: 1, viewerKey: 1 }, { unique: true }),
    db
      .collection("vidShares")
      .createIndex({ vidId: 1, userId: 1 }, { unique: true }),
    db
      .collection("vidComments")
      .createIndex({ vidId: 1, createdAt: -1, _id: -1 }),
  ]);
  indexesEnsured = true;
}

// ------------------------------------------------------------- Validation

export type VidCursor = { createdAt: string; _id: string };

// Parses a client-supplied cursor. Returns null for invalid cursors so a bad
// cursor behaves like "first page" instead of crashing the feed.
export function parseVidCursor(cursor: VidCursor | null | undefined): {
  createdAt: Date;
  _id: ObjectId;
} | null {
  if (!cursor) return null;
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;
  try {
    return { createdAt, _id: new ObjectId(cursor._id) };
  } catch {
    return null;
  }
}

export function isAllowedVideoMime(mime: string | null): boolean {
  return !!mime && VID_ALLOWED_MIME.has(mime.toLowerCase());
}

export function isAllowedVideoExtension(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return false;
  return VID_ALLOWED_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

// Extracts unique normalized hashtags (#foo #bar) from a caption. Tags are
// lowercased, stripped of their leading "#", capped at maxTags and truncated
// to maxLength characters each.
export function parseHashtags(
  caption: string,
  maxTags = VID_MAX_HASHTAGS,
  maxLength = VID_MAX_HASHTAG_LENGTH,
): string[] {
  const tags = caption.match(/#[a-zA-Z0-9_]+/g) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.slice(1).toLowerCase().slice(0, maxLength);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    if (result.length >= maxTags) break;
  }
  return result;
}

// Validates playback metadata reported by the client at publish time. All
// values are re-checked here so the client can't store absurd numbers.
export function validateVidMetadata(
  duration: unknown,
  width: unknown,
  height: unknown,
): { ok: true; duration: number; width: number; height: number } | { ok: false; error: string } {
  const d = Number(duration);
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(d) || d <= 0 || d > VID_MAX_DURATION_SECONDS) {
    return { ok: false, error: "Invalid video duration." };
  }
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    w > 8192 ||
    h > 8192
  ) {
    return { ok: false, error: "Invalid video dimensions." };
  }
  return { ok: true, duration: d, width: w, height: h };
}

// A view counts only after the video was meaningfully watched: at least 2
// seconds, or at least 50% of the duration. Pure so it can be unit tested.
export function qualifiesForView(
  watchedSeconds: unknown,
  videoDuration: unknown,
): boolean {
  const watched = Number(watchedSeconds);
  const duration = Number(videoDuration);
  if (!Number.isFinite(watched) || !Number.isFinite(duration)) return false;
  if (watched < 0 || duration <= 0) return false;
  if (watched >= 2) return true;
  return watched / duration >= 0.5;
}

// ------------------------------------------------------------- Serializers

function toVidAuthorCard(author: {
  _id: ObjectId;
  username: string;
  displayName: string;
  photo: string | null;
}): VidAuthorCard {
  return {
    _id: author._id.toString(),
    username: author.username,
    displayName: author.displayName,
    photo: author.photo,
  };
}

export function toSerializedVid(
  vid: Vid,
  author: VidAuthorCard,
  myLike: boolean,
  friendshipStatus: SerializedVid["friendshipStatus"],
): SerializedVid {
  return {
    _id: vid._id.toString(),
    userId: vid.userId.toString(),
    videoUrl: vid.videoUrl,
    thumbnailUrl: vid.thumbnailUrl,
    caption: vid.caption,
    hashtags: vid.hashtags,
    duration: vid.duration,
    width: vid.width,
    height: vid.height,
    viewCount: vid.viewCount,
    likeCount: vid.likeCount,
    commentCount: vid.commentCount,
    shareCount: vid.shareCount,
    status: vid.status,
    createdAt: vid.createdAt.toISOString(),
    author,
    myLike,
    friendshipStatus,
  };
}

// Resolves the viewer's relationship with a set of vid authors in a single
// query so the feed never does one friendships lookup per vid (N+1).
async function friendshipStatusByAuthor(
  viewerId: string | null,
  authorIds: ObjectId[],
): Promise<Map<string, SerializedVid["friendshipStatus"]>> {
  const map = new Map<string, SerializedVid["friendshipStatus"]>();
  for (const id of authorIds) map.set(id.toString(), "none");
  if (!viewerId || authorIds.length === 0) return map;

  const viewerOid = new ObjectId(viewerId);
  const rows = await getDb()
    .collection("friendships")
    .find({
      $or: [
        { requesterId: viewerOid, addresseeId: { $in: authorIds } },
        { requesterId: { $in: authorIds }, addresseeId: viewerOid },
      ],
    })
    .toArray();

  for (const row of rows) {
    const isViewerRequester = row.requesterId.toString() === viewerId;
    const otherId = (
      isViewerRequester ? row.addresseeId : row.requesterId
    ).toString();
    const current = map.get(otherId) ?? "none";
    if (row.status === "approved") {
      map.set(otherId, "friends");
    } else if (current === "none") {
      map.set(otherId, isViewerRequester ? "pending_out" : "pending_in");
    }
  }
  return map;
}

// ------------------------------------------------------------- Feed

// Cursor-based feed of published vids, newest first. Fetches authors, the
// viewer's likes, and friendship statuses with batched queries.
export async function getVidsFeedPage(
  viewerId: string | null,
  cursor: VidCursor | null | undefined,
  limit = VID_PAGE_SIZE,
): Promise<VidFeedPage> {
  await ensureVidIndexes();
  const db = getDb();

  const query: Record<string, unknown> = { status: "published" };
  const parsed = parseVidCursor(cursor);
  if (parsed) {
    query.$and = [
      {
        $or: [
          { createdAt: { $lt: parsed.createdAt } },
          { createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
        ],
      },
    ];
  }

  const rawVids = (await db
    .collection("vids")
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray()) as unknown as Vid[];

  const hasMore = rawVids.length > limit;
  const vids = rawVids.slice(0, limit);

  if (vids.length === 0) {
    return { videos: [], nextCursor: null };
  }

  const authorIds = [...new Map(vids.map((v) => [v.userId.toString(), v.userId])).values()];
  const authors = (await db
    .collection("users")
    .find({ _id: { $in: authorIds } })
    .project({ _id: 1, username: 1, displayName: 1, photo: 1 })
    .toArray()) as unknown as {
    _id: ObjectId;
    username: string;
    displayName: string;
    photo: string | null;
  }[];
  const authorById = new Map(authors.map((a) => [a._id.toString(), a]));

  const vidIds = vids.map((v) => v._id);
  const [likeRows, statuses] = await Promise.all([
    viewerId
      ? db
          .collection("vidLikes")
          .find({ vidId: { $in: vidIds }, userId: new ObjectId(viewerId) })
          .project({ vidId: 1 })
          .toArray()
      : Promise.resolve([]),
    friendshipStatusByAuthor(viewerId, authorIds),
  ]);
  const likedVidIds = new Set(likeRows.map((r) => r.vidId.toString()));

  const last = vids[vids.length - 1];
  const nextCursor: VidFeedPage["nextCursor"] = hasMore
    ? { createdAt: last.createdAt.toISOString(), _id: last._id.toString() }
    : null;

  return {
    videos: vids.flatMap((vid) => {
      const author = authorById.get(vid.userId.toString());
      if (!author) return [];
      return [
        toSerializedVid(
          vid,
          toVidAuthorCard(author),
          likedVidIds.has(vid._id.toString()),
          statuses.get(vid.userId.toString()) ?? "none",
        ),
      ];
    }),
    nextCursor,
  };
}

// Loads a single published vid with author, like and friendship status for the
// viewer. Used by /vids/[id] and its metadata generator.
export async function getVidById(
  vidId: string,
  viewerId: string | null,
): Promise<SerializedVid | null> {
  await ensureVidIndexes();
  let oid: ObjectId;
  try {
    oid = new ObjectId(vidId);
  } catch {
    return null;
  }
  const db = getDb();
  const vid = (await db
    .collection("vids")
    .findOne({ _id: oid, status: "published" })) as unknown as Vid | null;
  if (!vid) return null;

  const author = (await db
    .collection("users")
    .findOne(
      { _id: vid.userId },
      { projection: { _id: 1, username: 1, displayName: 1, photo: 1 } },
    )) as unknown as {
    _id: ObjectId;
    username: string;
    displayName: string;
    photo: string | null;
  } | null;
  if (!author) return null;

  const myLike = viewerId
    ? !!(await db
        .collection("vidLikes")
        .findOne({ vidId: oid, userId: new ObjectId(viewerId) }))
    : false;

  const statuses = await friendshipStatusByAuthor(viewerId, [vid.userId]);
  const friendshipStatus = statuses.get(vid.userId.toString()) ?? "none";

  return toSerializedVid(vid, toVidAuthorCard(author), myLike, friendshipStatus);
}

// Most recent published vids of a profile, used for the profile Vids section.
// The author card is the profile being viewed, so no per-vid user lookups run.
export async function getProfileVids(
  profileId: string,
  author: VidAuthorCard,
  limit = 6,
): Promise<SerializedVid[]> {
  await ensureVidIndexes();
  const vids = (await getDb()
    .collection("vids")
    .find({ userId: new ObjectId(profileId), status: "published" })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .toArray()) as unknown as Vid[];
  if (vids.length === 0) return [];

  return vids.map((vid) =>
    toSerializedVid(vid, author, false, "self"),
  );
}

// ------------------------------------------------------------- Comments

export function toSerializedVidComment(
  comment: VidComment,
  author: VidAuthorCard,
): SerializedVidComment {
  return {
    _id: comment._id.toString(),
    vidId: comment.vidId.toString(),
    authorId: comment.authorId.toString(),
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author,
  };
}

// Newest-first cursor pagination for a vid's comments.
export async function getVidCommentsPage(
  vidId: string,
  cursor: VidCursor | null | undefined,
  limit = VID_COMMENT_PAGE_SIZE,
): Promise<{ comments: SerializedVidComment[]; nextCursor: VidCursor | null }> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(vidId);
  } catch {
    return { comments: [], nextCursor: null };
  }
  const db = getDb();
  const query: Record<string, unknown> = { vidId: oid };
  const parsed = parseVidCursor(cursor);
  if (parsed) {
    query.$and = [
      {
        $or: [
          { createdAt: { $lt: parsed.createdAt } },
          { createdAt: parsed.createdAt, _id: { $lt: parsed._id } },
        ],
      },
    ];
  }
  const raw = (await db
    .collection("vidComments")
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray()) as unknown as VidComment[];
  const hasMore = raw.length > limit;
  const comments = raw.slice(0, limit);

  const authorIds = [...new Map(comments.map((c) => [c.authorId.toString(), c.authorId])).values()];
  const authors =
    authorIds.length > 0
      ? ((await db
          .collection("users")
          .find({ _id: { $in: authorIds } })
          .project({ _id: 1, username: 1, displayName: 1, photo: 1 })
          .toArray()) as unknown as {
          _id: ObjectId;
          username: string;
          displayName: string;
          photo: string | null;
        }[])
      : [];
  const authorById = new Map(authors.map((a) => [a._id.toString(), a]));

  const last = comments[comments.length - 1];
  return {
    comments: comments.flatMap((c) => {
      const author = authorById.get(c.authorId.toString());
      return author ? [toSerializedVidComment(c, toVidAuthorCard(author))] : [];
    }),
    nextCursor:
      hasMore && last
        ? { createdAt: last.createdAt.toISOString(), _id: last._id.toString() }
        : null,
  };
}

// ------------------------------------------------------------- Views

// Hashes an anonymous viewer's IP so raw addresses are never stored.
export function anonymousViewerKey(ip: string): string {
  const secret = process.env.AUTH_SECRET || "dev-only-secret-not-for-production";
  return `ip:${createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32)}`;
}

// Records a view for a vid when the watch qualifies and the viewer hasn't
// already been counted for this vid (unique index on vidId + viewerKey).
// Returns true when the counter was incremented.
export async function recordVidView(
  vidId: string,
  viewerKey: string,
  watchedSeconds: number,
  videoDuration: number,
): Promise<{ ok: boolean; counted: boolean; error?: string }> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(vidId);
  } catch {
    return { ok: false, counted: false, error: "Invalid vid id." };
  }
  // Cap the reported watch time at the video duration so a client can't
  // inflate beyond what could actually have been watched.
  const cappedWatched = Math.min(watchedSeconds, videoDuration);
  if (!qualifiesForView(cappedWatched, videoDuration)) {
    return { ok: true, counted: false };
  }
  const db = getDb();
  const vid = await db
    .collection("vids")
    .findOne({ _id: oid, status: "published" }, { projection: { _id: 1 } });
  if (!vid) return { ok: false, counted: false, error: "Vid not found." };

  try {
    await db.collection("vidViews").insertOne({
      vidId: oid,
      viewerKey,
      createdAt: new Date(),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      // Already counted for this viewer/vid.
      return { ok: true, counted: false };
    }
    throw error;
  }
  await db
    .collection("vids")
    .updateOne({ _id: oid }, { $inc: { viewCount: 1 } });
  return { ok: true, counted: true };
}

// ------------------------------------------------------------- Cleanup

// Deletes R2 objects and records for uploads that never reached "published"
// (abandoned, failed, or stuck processing) after VID_ABANDONED_AGE_MS. Safe to
// call on a schedule or opportunistically from an upload.
export async function cleanupAbandonedVids(): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - VID_ABANDONED_AGE_MS);
  const stale = (await db
    .collection("vids")
    .find(
      { status: { $in: ["uploading", "processing", "failed"] }, createdAt: { $lt: cutoff } },
      { projection: { _id: 1, videoKey: 1, thumbnailKey: 1 } },
    )
    .toArray()) as unknown as { _id: ObjectId; videoKey: string; thumbnailKey: string | null }[];

  if (stale.length === 0) return 0;

  await Promise.all(
    stale.flatMap((vid) => [
      deleteObject(vid.videoKey).catch(() => {}),
      deleteObject(vid.thumbnailKey).catch(() => {}),
    ]),
  );
  await db
    .collection("vids")
    .deleteMany({ _id: { $in: stale.map((s) => s._id) } });
  return stale.length;
}

// Lets an owner recover immediately from unfinished uploads instead of waiting
// for the 24-hour abandoned-upload cleanup window. This is intentionally
// limited to non-published records and is used by the upload page's recovery
// button when the in-progress limit has been reached.
export async function deleteUserUnpublishedVids(userId: string): Promise<number> {
  const db = getDb();
  const vids = (await db
    .collection("vids")
    .find(
      {
        userId: new ObjectId(userId),
        status: { $in: ["uploading", "processing", "failed"] },
      },
      { projection: { _id: 1, videoKey: 1, thumbnailKey: 1 } },
    )
    .toArray()) as unknown as { _id: ObjectId; videoKey: string; thumbnailKey: string | null }[];

  if (vids.length === 0) return 0;

  await Promise.all(
    vids.flatMap((vid) => [
      deleteObject(vid.videoKey).catch(() => {}),
      deleteObject(vid.thumbnailKey).catch(() => {}),
    ]),
  );
  await db.collection("vids").deleteMany({ _id: { $in: vids.map((vid) => vid._id) } });
  return vids.length;
}

// --------------------------------------------------------- Rate limiting

// A user may start at most VID_MAX_UPLOADS_PER_HOUR uploads per hour and keep
// at most VID_MAX_IN_PROGRESS un-finished uploads at a time.
export async function canStartUpload(userId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const db = getDb();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [recentCount, inProgress] = await Promise.all([
    db.collection("vids").countDocuments({
      userId: new ObjectId(userId),
      status: { $in: ["uploading", "processing", "published"] },
      createdAt: { $gt: since },
    }),
    db.collection("vids").countDocuments({
      userId: new ObjectId(userId),
      status: { $in: ["uploading", "processing"] },
    }),
  ]);
  if (recentCount >= VID_MAX_UPLOADS_PER_HOUR) {
    return {
      allowed: false,
      error: `You've reached the limit of ${VID_MAX_UPLOADS_PER_HOUR} Vids uploads per hour. Please try again later.`,
    };
  }
  if (inProgress >= VID_MAX_IN_PROGRESS) {
    return {
      allowed: false,
      error: "You already have uploads in progress. Finish or wait for them to expire before uploading more.",
    };
  }
  return { allowed: true };
}

// Simple anti-spam guard for vid comments.
export async function canPostComment(userId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await getDb()
    .collection("vidComments")
    .countDocuments({ authorId: new ObjectId(userId), createdAt: { $gt: since } });
  if (recent >= VID_COMMENTS_PER_HOUR) {
    return {
      allowed: false,
      error: `You've reached the limit of ${VID_COMMENTS_PER_HOUR} comments per hour. Please try again later.`,
    };
  }
  return { allowed: true };
}