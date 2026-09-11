"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { getMoreGameScoresAction } from "@/app/actions";
import type { GameLeaderboard } from "@/lib/types";
import Box from "@/app/components/Box";
import UserAvatar from "@/app/components/UserAvatar";

export default function GamesLeaderboard({
    initial,
    currentUserId,
}: {
    initial: GameLeaderboard;
    currentUserId?: string | null;
}) {
    const [leaderboard, setLeaderboard] = useState(initial);
    const [offset, setOffset] = useState(0);
    const [pending, startTransition] = useTransition();
    const loadingRef = useRef(false);

    const hasMore = leaderboard.nextCursor !== null;

    const loadMore = useCallback(() => {
        if (loadingRef.current || !leaderboard.nextCursor) return;
        loadingRef.current = true;
        startTransition(async () => {
            try {
                const next = await getMoreGameScoresAction(
                    leaderboard.gameId,
                    leaderboard.nextCursor,
                );
                setLeaderboard((prev) => ({
                    gameId: next.gameId,
                    scores: [...prev.scores, ...next.scores],
                    nextCursor: next.nextCursor,
                    myRank: prev.myRank,
                    myBest: prev.myBest,
                    myGamesPlayed: prev.myGamesPlayed,
                }));
                setOffset((o) => o + next.scores.length);
            } finally {
                loadingRef.current = false;
            }
        });
    }, [leaderboard.gameId, leaderboard.nextCursor]);

    return (
        <Box title="All-Users Leaderboard">
            {currentUserId && leaderboard.myRank !== null && (
                <div className="mb-3 border border-[#6699cc] bg-[#fbe9f6] p-2 text-[13px]">
                    <span className="font-bold text-[#003399]">
                        Your rank: #{leaderboard.myRank}
                    </span>
                    <span className="text-[#2c4d80]">
                        {"  ·  "}Best:{" "}
                        {leaderboard.myBest?.toLocaleString() ?? "—"}
                    </span>

                    <span className="text-[#2c4d80]">
                        {"  ·  "}Rounds played:{" "}
                        {leaderboard.myGamesPlayed ?? 0}
                    </span>
                </div>
            )}
            {currentUserId && leaderboard.myRank === null && (
                <p className="mb-3 text-[13px] text-[#2c4d80]">
                    No scores yet — play a round to get on the board.
                </p>
            )}
            {!currentUserId && (
                <p className="mb-3 text-[13px] text-[#2c4d80]">
                    <Link
                        href="/login"
                        className="text-[#003399] underline"
                    >
                        Log in
                    </Link>{" "}
                    to play and place on the ranking.
                </p>
            )}

            {leaderboard.scores.length === 0 ? (
                <p className="py-6 text-center text-[#2c4d80]">
                    No high scores yet. Be the first!
                </p>
            ) : (
                <ol className="flex flex-col">
                    {leaderboard.scores.map((score, i) => {
                        const rank = offset + i + 1;
                        const mine = score.userId === currentUserId;
                        return (
                            <li
                                key={score._id}
                                className={`flex items-center gap-2 border-b border-[#dbe9f7] py-1.5 last:border-b-0 ${
                                    mine ? "bg-[#fbe9f6]" : ""
                                }`}
                            >
                                <span
                                    className={`w-7 shrink-0 text-center text-[12px] font-bold ${
                                        rank <= 3
                                            ? "text-[#cc3399]"
                                            : "text-[#2c4d80]"
                                    }`}
                                >
                                    {rank}
                                </span>
                                <Link
                                    href={`/${score.author.username}`}
                                    className="flex min-w-0 items-center gap-2"
                                >
                                    <UserAvatar
                                        src={score.author.photo}
                                        alt={score.author.username}
                                        cloudinaryWidth={56}
                                        className="h-7 w-7 shrink-0 rounded-sm border border-[#6699cc] object-cover"
                                    />
                                    <span className="min-w-0 truncate text-[13px] font-bold text-[#003399] hover:underline">
                                        {score.author.displayName}
                                    </span>
                                </Link>
                                {mine && (
                                    <span className="rounded-sm bg-[#cc3399] px-1.5 text-[10px] font-bold text-white">
                                        you
                                    </span>
                                )}
                                <span className="ml-auto shrink-0 text-[13px] font-bold text-black">
                                    {score.bestScore.toLocaleString()}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {hasMore && (
                <button
                    type="button"
                    className="btn mt-3 w-full"
                    onClick={loadMore}
                    disabled={pending}
                >
                    {pending ? "Loading..." : "More scores"}
                </button>
            )}
        </Box>
    );
}