import { getDb, ObjectId } from "@/lib/db";
import type {
  GameId,
  GameLeaderboard,
  GameScore,
  GameScoreAuthorCard,
  GameScoreCursor,
  SerializedGameScore,
} from "@/lib/types";

export const GAMES_LEADERBOARD_PAGE_SIZE = 25;
export const GAME_MAX_SCORE = 9_999_999;
// Server-enforced minimum a player must have "played" before a score counts.
// The client reports play time; this is a casual anti-abuse floor, not real
// protection against a crafted request.
export const GAME_MIN_PLAY_SECONDS = 5;
// Minimum gap between submissions from the same user, so a script cannot spam
// thousands of cheap submissions per hour into the gamesPlayed counter.
export const GAME_SUBMISSION_COOLDOWN_MS = 3_000;

export const GAMES_SCORE_COLLECTION = "gameScores";
export const GAMES_RATE_LIMIT_COLLECTION = "gameScoreSubmissions";

// ------------------------------------------------------------ Pure helpers

// Parses a Strict mode integer score from untrusted input. Returns null for
// anything out of range rather than throwing.
export function normalizeTetrisScore(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  if (!Number.isInteger(input) || input < 0 || input > GAME_MAX_SCORE) {
    return null;
  }
  return input;
}

// Parses a defensively shaped play-time value from the client.
export function normalizePlaySeconds(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  if (input < GAME_MIN_PLAY_SECONDS) return null;
  return Math.min(input, 3600);
}

export function parseGameScoreCursor(
  cursor: GameScoreCursor | null | undefined,
): GameScoreCursor | null {
  if (!cursor) return null;
  if (!Number.isFinite(cursor.bestScore)) return null;
  const updatedAt = new Date(cursor.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return null;
  try {
    new ObjectId(cursor._id);
  } catch {
    return null;
  }
  return cursor;
}

// ---------------------------------------------------------------- Indexes

let indexesEnsured = false;

// Idempotent index setup, mirroring ensureVidIndexes. Runs once per process.
export async function ensureGameIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = getDb();
  await Promise.all([
    db
      .collection(GAMES_SCORE_COLLECTION)
      .createIndex({ gameId: 1, userId: 1 }, { unique: true }),
    // Leaderboard sort: best score desc, then earliest-to-reach asc, then _id.
    db
      .collection(GAMES_SCORE_COLLECTION)
      .createIndex({ gameId: 1, bestScore: -1, updatedAt: 1, _id: 1 }),
    db
      .collection(GAMES_RATE_LIMIT_COLLECTION)
      .createIndex({ userId: 1, createdAt: -1 }),
  ]);
  indexesEnsured = true;
}

// ------------------------------------------------------------ Score writing

export interface RecordScoreResult {
  isNewBest: boolean;
  bestScore: number;
  gamesPlayed: number;
}

// Records a finished game. Keeps one document per (gameId, userId) updated to
// the player's best score; this is the document the leaderboard ranks by.
export async function recordGameScore(
  gameId: GameId,
  userId: string,
  score: number,
): Promise<RecordScoreResult> {
  await ensureGameIndexes();
  const db = getDb();
  const oid = new ObjectId(userId);
  const now = new Date();

  const existing = (await db
    .collection(GAMES_SCORE_COLLECTION)
    .findOne({ gameId, userId: oid })) as unknown as GameScore | null;

  if (!existing) {
    try {
      await db.collection(GAMES_SCORE_COLLECTION).insertOne({
        gameId,
        userId: oid,
        bestScore: score,
        gamesPlayed: 1,
        createdAt: now,
        updatedAt: now,
      });
      return { isNewBest: true, bestScore: score, gamesPlayed: 1 };
    } catch (error) {
      // Lost the race to another insert (unique index). Fall through to the
      // update path below.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  const current = existing ?? (await db
    .collection(GAMES_SCORE_COLLECTION)
    .findOne({ gameId, userId: oid })) as unknown as GameScore | null;

  if (!current) throw new Error("Failed to load game score.");
  const isNewBest = score > current.bestScore;

  await db.collection(GAMES_SCORE_COLLECTION).updateOne(
    { gameId, userId: oid },
    {
      $inc: { gamesPlayed: 1 },
      ...(isNewBest
        ? { $set: { bestScore: score, updatedAt: now } }
        : {}),
    },
  );

  return {
    isNewBest,
    bestScore: Math.max(current.bestScore, score),
    gamesPlayed: current.gamesPlayed + 1,
  };
}

// Casual anti-abuse cooldown: lets through the many legitimate rapid-fire
// submissions and rejects only tight scripted loops.
export async function canSubmitScore(userId: string): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const db = getDb();
  const latest = (await db
    .collection(GAMES_RATE_LIMIT_COLLECTION)
    .findOne(
      { userId: new ObjectId(userId) },
      { sort: { createdAt: -1 }, projection: { createdAt: 1 } },
    )) as unknown as { createdAt: Date } | null;

  if (latest && Date.now() - latest.createdAt.getTime() < GAME_SUBMISSION_COOLDOWN_MS) {
    return {
      allowed: false,
      error: "Whoa, slow down! Take a breath before your next round.",
    };
  }

  await db.collection(GAMES_RATE_LIMIT_COLLECTION).insertOne({
    userId: new ObjectId(userId),
    createdAt: new Date(),
  });
  return { allowed: true };
}

// ------------------------------------------------------------- Leaderboard

function toGameScoreAuthorCard(author: {
  _id: ObjectId;
  username: string;
  displayName: string;
  photo: string | null;
}): GameScoreAuthorCard {
  return {
    _id: author._id.toString(),
    username: author.username,
    displayName: author.displayName,
    photo: author.photo,
  };
}

function toSerializedGameScore(
  score: GameScore,
  author: GameScoreAuthorCard,
): SerializedGameScore {
  return {
    _id: score._id.toString(),
    gameId: score.gameId,
    userId: score.userId.toString(),
    bestScore: score.bestScore,
    gamesPlayed: score.gamesPlayed,
    createdAt: score.createdAt.toISOString(),
    updatedAt: score.updatedAt.toISOString(),
    author,
  };
}

// 1-based rank of the viewer's best score for a game. Ties are broken by the
// same rule as the leaderboard sort: the player who reached the score first
// (earlier updatedAt) places higher.
async function rankOfScore(
  gameId: GameId,
  score: GameScore,
): Promise<number> {
  const db = getDb();
  const higher = await db.collection(GAMES_SCORE_COLLECTION).countDocuments({
    gameId,
    $or: [
      { bestScore: { $gt: score.bestScore } },
      {
        bestScore: score.bestScore,
        updatedAt: { $lt: score.updatedAt },
      },
    ],
  });
  return higher + 1;
}

// Top scores for a game plus the viewer's own statistics. Cursor-based like
// the vids feed: rows sort by bestScore desc, updatedAt asc, _id asc. The
// viewer stats are only computed for the first page (cursor null) — paging
// keeps the rank the client already knew, consistent with the feed pattern.
export async function getGameLeaderboard(
  gameId: GameId,
  viewerId: string | null,
  cursor: GameScoreCursor | null | undefined,
  limit = GAMES_LEADERBOARD_PAGE_SIZE,
): Promise<GameLeaderboard> {
  await ensureGameIndexes();
  const db = getDb();
  const parsed = parseGameScoreCursor(cursor);

  const query: Record<string, unknown> = { gameId };
  if (parsed) {
    query.$or = [
      { bestScore: { $lt: parsed.bestScore } },
      {
        bestScore: parsed.bestScore,
        $or: [
          { updatedAt: { $gt: new Date(parsed.updatedAt) } },
          {
            updatedAt: new Date(parsed.updatedAt),
            _id: { $gt: new ObjectId(parsed._id) },
          },
        ],
      },
    ];
  }

  const rawScores = (await db
    .collection(GAMES_SCORE_COLLECTION)
    .find(query)
    .sort({ bestScore: -1, updatedAt: 1, _id: 1 })
    .limit(limit + 1)
    .toArray()) as unknown as GameScore[];

  const hasMore = rawScores.length > limit;
  const scores = rawScores.slice(0, limit);

  let myRank: number | null = null;
  let myBest: number | null = null;
  let myGamesPlayed: number | null = null;

  let viewerScore: GameScore | null = null;
  if (viewerId && !cursor) {
    viewerScore = (await db
      .collection(GAMES_SCORE_COLLECTION)
      .findOne({
        gameId,
        userId: new ObjectId(viewerId),
      })) as unknown as GameScore | null;
  }

  if (viewerScore) {
    myBest = viewerScore.bestScore;
    myGamesPlayed = viewerScore.gamesPlayed;
    myRank = await rankOfScore(gameId, viewerScore);
  }

  if (scores.length === 0) {
    return {
      gameId,
      scores: [],
      nextCursor: null,
      myRank,
      myBest,
      myGamesPlayed,
    };
  }

  const userIds = [
    ...new Map(scores.map((s) => [s.userId.toString(), s.userId])).values(),
  ];
  const authors = (await db
    .collection("users")
    .find({ _id: { $in: userIds } })
    .project({ _id: 1, username: 1, displayName: 1, photo: 1 })
    .toArray()) as unknown as {
    _id: ObjectId;
    username: string;
    displayName: string;
    photo: string | null;
  }[];
  const authorById = new Map(authors.map((a) => [a._id.toString(), a]));

  const last = scores[scores.length - 1];
  const nextCursor: GameScoreCursor | null = hasMore
    ? {
        bestScore: last.bestScore,
        updatedAt: last.updatedAt.toISOString(),
        _id: last._id.toString(),
      }
    : null;

  return {
    gameId,
    scores: scores.flatMap((score) => {
      const author = authorById.get(score.userId.toString());
      if (!author) return [];
      return [toSerializedGameScore(score, toGameScoreAuthorCard(author))];
    }),
    nextCursor,
    myRank,
    myBest,
    myGamesPlayed,
  };
}