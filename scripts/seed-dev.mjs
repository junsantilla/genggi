// Dev-only seeder: creates a single demo login and a handful of Tetris
// leaderboard entries so the app is usable without MongoDB setup, Firebase,
// R2, or Resend. Never run against a production database.
//
// Usage:
//   node scripts/seed-dev.mjs                 # upsert everything (idempotent)
//   node scripts/seed-dev.mjs --fresh         # wipe users/sessions/gameScores first
//   node scripts/seed-dev.mjs --uri=mongodb://localhost:27017/genggeng
//
// Demo login after seeding: demo / demo1234

import { MongoClient, ObjectId } from "mongodb";
import { scryptSync, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

// Matches lib/auth.ts (salt:scrypt(password, salt, 64) hex).
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const DEMO = {
  username: "demo",
  email: "demo@genggi.local",
  password: "demo1234",
  displayName: "Demo",
  bestScore: 5300,
};

// Leaderboard flavor: synthetic players that back the gameScores rows. None of
// these can log in (no password hash), they just make /games look alive.
const BOTS = [
  ["blockbuster88", "Blockbuster", 9120, 41],
  ["tetrisqueen", "Tetris Queen", 8700, 33],
  ["retrobyte", "Retrobyte", 7950, 26],
  ["matrixfall", "MatrixFall", 7410, 19],
  ["dropzone", "DropZoner", 6680, 24],
  ["pedrothestacker", "Pedro", 6040, 15],
  ["lineclearz", "LineClearZ", 5770, 12],
  ["pixelmason", "Pixel Mason", 4490, 9],
  ["sevenbag", "SevenBag", 3880, 7],
  ["rookielog", "Rookie", 2150, 4],
];

function resolveUri(cliUri) {
  if (cliUri) return cliUri;
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envFile = new URL("../.env.local", import.meta.url);
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const match = line.match(/^\s*MONGODB_URI\s*=\s*"?([^"#]+)"?\s*$/);
      if (match) return match[1].trim();
    }
  }
  return "mongodb://localhost:27017/genggeng";
}

function profileFields() {
  return {
    firstName: "",
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
}

async function main() {
  const args = process.argv.slice(2);
  const fresh = args.includes("--fresh");
  const uriArg = args.find((a) => a.startsWith("--uri="));
  const uri = resolveUri(uriArg ? uriArg.slice("--uri=".length) : null);

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();
  const users = db.collection("users");
  const scores = db.collection("gameScores");

  console.log(`Connected to ${uri}`);

  if (fresh) {
    await Promise.all([
      db.dropCollection("sessions").catch(() => {}),
      db.dropCollection("gameScores").catch(() => {}),
      db.dropCollection("gameScoreSubmissions").catch(() => {}),
      db.dropCollection("users").catch(() => {}),
    ]);
    console.log("Dropped users, sessions, gameScores (--fresh)");
  }

  // --- Demo login user ----------------------------------------------------
  const demo = {
    _id: new ObjectId(),
    username: DEMO.username,
    email: DEMO.email,
    passwordHash: hashPassword(DEMO.password),
    role: "user",
    banned: false,
    emailVerified: true,
    authProvider: "local",
    onboardingCompleted: true,
    createdAt: new Date(),
    displayName: DEMO.displayName,
    ...profileFields(),
  };

  const demoUser = await users.findOne({ username: DEMO.username });
  if (demoUser) {
    await users.updateOne({ _id: demoUser._id }, { $set: { ...demo, _id: demoUser._id } });
  } else {
    await users.insertOne(demo);
  }
  const demoId = (await users.findOne({ username: DEMO.username }))._id;

  // --- Leaderboard players ------------------------------------------------
  const seeded = [];
  for (const [username, displayName, bestScore, gamesPlayed] of BOTS) {
    const bot = {
      _id: new ObjectId(),
      username,
      email: `${username}@genggi.local`,
      passwordHash: "",
      role: "user",
      banned: false,
      emailVerified: true,
      authProvider: "local",
      onboardingCompleted: true,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000),
      displayName,
      ...profileFields(),
    };
    await users.replaceOne({ username }, bot, { upsert: true });
    seeded.push([(await users.findOne({ username }))._id, bestScore, gamesPlayed]);
  }
  seeded.push([demoId, DEMO.bestScore, 3]);

  // --- gameScores (one doc per (gameId, userId) = best score) -------------
  for (const [userId, bestScore, gamesPlayed] of seeded) {
    const achievedAt = new Date(
      Date.now() - Math.floor(Math.random() * 60) * 86400000,
    );
    const doc = {
      gameId: "tetris",
      userId,
      bestScore,
      gamesPlayed,
      createdAt: achievedAt,
      updatedAt: achievedAt,
    };
    await scores.replaceOne(
      { gameId: "tetris", userId },
      doc,
      { upsert: true },
    );
  }

  // --- Guarantee the leaderboard indexes exist -----------------------------
  await Promise.all([
    scores.createIndex({ gameId: 1, userId: 1 }, { unique: true }),
    scores.createIndex({ gameId: 1, bestScore: -1, updatedAt: 1, _id: 1 }),
  ]);

  await client.close();

  console.log(`Seeded 1 login user + ${seeded.length} leaderboard entries.`);
  console.log("Login: demo / demo1234 → http://localhost:3000/games");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});