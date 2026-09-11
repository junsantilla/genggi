# Genggi

Genggi is a nostalgic social network for custom profiles, friends, messages, communities, bulletin posts, and guestbook-style testimonials.

## Features

- Create an account with email/password or Google sign-in.
- Build a custom profile with layouts, profile details, photos, friends, and testimonials.
- Share bulletin posts with public, friends-only, or private visibility.
- Post and watch **Vids** — short vertical videos with likes, comments, sharing, and view counts.
- Play casual **Games** like Tetris with an all-users high-score leaderboard.
- Send messages, use chatboxes, join groups, and receive notifications.
- Search members and report bugs from inside the app.

## Tech Stack

- Next.js 16 App Router and React 19
- TypeScript
- MongoDB for application data
- Firebase Authentication for Google sign-in
- Cloudflare R2 for image and video storage
- Resend for verification and password-reset email
- Tailwind CSS 4
- Vitest and Testing Library

## Requirements

- Node.js 20.9 or newer
- npm
- A MongoDB database
- Firebase project credentials if Google sign-in is enabled
- Cloudflare R2 credentials for image uploads
- Resend credentials for account emails

## Getting Started

1. Install dependencies:

    ```bash
    npm install
    ```

2. Create `.env.local` in the project root. Configure the variables below.

    ```dotenv
    MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/
    MONGODB_DB=genggeng
    AUTH_SECRET=replace-with-a-long-random-secret

    NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
    NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id

    R2_BUCKET=your-r2-bucket
    R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
    R2_ACCESS_KEY_ID=your-r2-access-key-id
    R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
    R2_PUBLIC_URL=https://cdn.example.com

    RESEND_API_KEY=your-resend-api-key
    RESEND_FROM=Genggi <noreply@example.com>
    ```

    `MONGODB_DB` defaults to `genggeng`. `RESEND_FROM` defaults to Resend's shared testing sender. In production, `AUTH_SECRET` is required. The Firebase variables are exposed to the browser by design; keep MongoDB, R2, Resend, and auth-secret values private.

3. Start the development server:

    ```bash
    npm run dev
    ```

4. Open [http://localhost:3000](http://localhost:3000).

To use Google sign-in locally, enable Google as a Firebase Authentication provider and add your local and deployed domains to Firebase's authorized domains. To send email from a custom address, verify the domain in Resend and set `RESEND_FROM`.

### Local quickstart (no external services)

You only need Node.js and a running MongoDB to try the site locally — no Firebase, R2, or Resend required. Games, profiles, messages, chatboxes, groups, and the bulletin all work; photo uploads, Google sign-in, and verification emails need their respective services.

1. Make sure MongoDB is running on `localhost:27017`. If you don't have it installed, use Docker:

    ```bash
    docker run --name genggi-mongo -d -p 27017:27017 mongo:7
    ```

2. Install dependencies and seed a demo account plus leaderboard data:

    ```bash
    npm install
    node scripts/seed-dev.mjs
    ```

3. Start the dev server and log in with `demo` / `demo1234`, then visit [http://localhost:3000/games](http://localhost:3000/games).

Notes:

- The seeder is idempotent (re-run it any time) and dev-only — never run it against production. `node scripts/seed-dev.mjs --fresh` wipes `users`, `sessions`, `gameScores`, and `gameScoreSubmissions` before seeding.
- Point it at another MongoDB with `--uri=`: `node scripts/seed-dev.mjs --uri=mongodb://host:27017/db`.
- Signing up locally works but won't let you log in until the email is verified (that needs Resend). The seeded `demo` user is pre-verified, which is why the seeder exists.

## Vids (short-form video)

Vids is the app's short-form vertical video feed at `/vids` (watch), `/vids/upload` (post), and `/vids/{vidId}` (dedicated shareable page). It reuses the existing account system, friendship/follow system, R2 storage, and the `reports` moderation queue.

### Upload flow

1. The client validates the file (MP4/MOV/WebM/MKV, ≤ 100 MB, MIME + extension).
2. The video streams directly to R2 through `POST /api/vids/upload` with upload progress and cancellation. The server re-validates size, MIME, authentication, and per-user rate limits (10 uploads/hour, 3 in progress), and stores it at a deterministic key — `vids/{userId}/{vidId}/video.mp4` — never derived from the user's filename.
3. The browser captures a thumbnail frame (canvas) and posts it to `POST /api/vids/{vidId}/thumbnail` (stored as `vids/{userId}/{vidId}/thumbnail.jpg`).
4. The user adds a caption/hashtags and publishes via `finishVidAction`, which runs the server-side processing hook (`lib/video-processing.ts`) and marks the record `published`.

Video processing is a documented passthrough today (no transcoder is deployed). To add FFmpeg optimization (9:16, ≤ 1080×1920, H.264/AAC MP4, ~10–30 MB), implement `processVideo` in `lib/video-processing.ts`; the status lifecycle (`uploading → processing → published`) already supports it.

### View counting

Views are counted server-side at `POST /api/vids/{vidId}/view`. A view counts only when the client reports ≥ 2 seconds watched or ≥ 50% of the duration, and the server caps the reported time, validates the numbers, and deduplicates per viewer (unique index on `vidId + viewerKey`, where logged-in viewers are keyed by user id and guests by an HMAC of their IP). The client can never write counters directly.

### Data model

- `vids` — one document per Vid with `videoKey`/`videoUrl`, `thumbnailKey`/`thumbnailUrl`, caption, hashtags, playback metadata, counters (`viewCount`, `likeCount`, `commentCount`, `shareCount`), and a `status` (`uploading | processing | published | failed | deleted`). Indexed on `status + createdAt` and `userId + status + createdAt`.
- `vidLikes` — unique `(vidId, userId)` so a user can like once.
- `vidComments` — `(vidId, createdAt)` index; cursor-paginated (newest first).
- `vidViews` — unique `(vidId, viewerKey)` used for view deduplication.
- `vidShares` — unique `(vidId, userId)` so shares count once per user.
- Vid reports are stored in the existing `reports` collection with `type: "vid"` and reviewed through `adminReviewReportAction`.

Indexes are created idempotently on first use (`ensureVidIndexes`); there is no migration step.

### R2 cleanup

Abandoned/failed uploads never reached `published` are removed (R2 objects + records) after 24 hours by `cleanupAbandonedVids`. It runs opportunistically from the upload endpoint and via the admin-only `runVidCleanupAction`; in production, point a cron job at that action (e.g. a daily request to a server action). Deleting a Vid removes its R2 objects and all related records, and admin user deletion cleans up the user's Vids too.

No additional environment variables are required — Vids uses the same `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_URL` as image uploads. The bucket's public URL must serve videos with HTTP range-request support (R2 supports this natively), and the upload route must be reachable with a body limit above 100 MB.

## Games (Tetris)

Games live at `/games` (also linked in the nav). The Tetris client (`app/components/TetrisGame.tsx`) runs a pure, unit-tested engine in `lib/tetris.ts`; the leaderboard shows every player's best score plus your own rank.

- Scores are submitted through `submitGameScoreAction`, which requires login, re-validates the score (integer, within bounds) and play time (≥ 5 seconds), then records only the player's **best** score via `recordGameScore`.
- `gameScores` — one document per `(gameId, userId)` holding `bestScore`, `gamesPlayed`, and `updatedAt` (earliest to reach a score places higher on ties). Indexed with a unique `(gameId, userId)` key and a leaderboard sort key `(gameId, bestScore, updatedAt, _id)`; indexes are created idempotently on first use like the Vids ones.
- The model is generic on `gameId` ("tetris" today), so adding future games is just a new client game plus a page — no schema change.
- A light submission cooldown (`gameScoreSubmissions`) stops scripted spam; this is casual anti-abuse, not real score verification.

## Available Scripts

| Command         | Purpose                                    |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Start the local development server         |
| `npm run lint`  | Run ESLint                                 |
| `npm test`      | Run the Vitest test suite once             |
| `npm run build` | Create a production build                  |
| `npm start`     | Start the production server after building |

## Project Layout

- `app/` contains routes, server actions, API routes, and UI components.
- `lib/` contains authentication, database access, storage, email, queries, and shared domain logic.
- `public/` contains static assets and the service worker.
- `*.test.ts` and `*.test.tsx` files contain unit and component tests.

## Production Deployment

Build the application with `npm run build`, then run it with `npm start`. Provide the same environment variables in the hosting provider's server and build environments. Configure the production hostname in Firebase, ensure the R2 public URL is reachable, and use a verified Resend sender domain.

Do not commit `.env.local` or any credentials. Environment files are ignored by Git.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, testing expectations, and pull request guidelines.
