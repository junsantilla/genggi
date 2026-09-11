# PR Checks — Tetris & Games Leaderboard

Verification results for the `games/tetris` branch on commit `8cb862f`.

## Test

```bash
npm test
```

**Result:** Passed — 16 test files, 102 tests, all green.

- `lib/tetris.test.ts` — engine: movement, rotation/wall kicks, line clears, scoring, gravity, hard drop, game-over.
- `lib/games.test.ts` — score/play-time validation and leaderboard cursor parsing.

## Build

```bash
npm run build
```

**Result:** Passed — compiled successfully, TypeScript clean, 30 pages generated. `/games` route included.

## Lint

```bash
npm run lint
```

**Result:** 2 errors + 11 warnings — **all pre-existing, none in games code.**

| Severity | File | Issue |
|----------|------|-------|
| error | `app/components/AuthForm.tsx` | setState in effect |
| error | `app/components/PwaInstallButton.tsx` | setState in effect |
| warning | `app/components/NavBar.tsx` | unused `isAdmin` (exists on `main`) |

The remaining warnings are unused variables and `<img>` suggestions in `BulletinPostCard`, `PostCard`, `LayoutsGallery`, `MessageRecipientSearch`, `groups/page`, `layouts/[id]/page`, `messages/[id]/page`, and `lib/group.ts`.

Games-specific files (`lib/tetris.*`, `lib/games.*`, `TetrisGame`, `GamesLeaderboard`, `games/page`, `actions`, `types`, `usernames`) lint with **0 errors, 0 warnings**.

> Note: `NavBar.tsx:37` (`isAdmin` unused) and the 2 errors were confirmed to exist on `main` before this branch — not introduced here.