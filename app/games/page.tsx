import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getGameLeaderboard } from "@/lib/games";
import TetrisGame from "@/app/components/TetrisGame";
import GamesLeaderboard from "@/app/components/GamesLeaderboard";

export const metadata: Metadata = {
    title: "Games",
    description:
        "Play casual games on Genggi and climb the all-users leaderboard.",
};

export default async function GamesPage() {
    const user = await getCurrentUser();
    const viewerId = user?._id.toString() ?? null;
    const leaderboard = await getGameLeaderboard("tetris", viewerId, null);

    return (
        <div className="games-page mx-auto max-w-[960px] p-2 sm:p-3">
            <div className="mb-3">
                <h1 className="text-2xl font-bold text-[#003399]">Games</h1>
                <p className="text-sm text-[#2c4d80]">
                    Stack blocks, clear lines, and climb the all-users ranking.
                </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <TetrisGame isLoggedIn={!!user} />
                <GamesLeaderboard
                    initial={leaderboard}
                    currentUserId={viewerId}
                />
            </div>
        </div>
    );
}