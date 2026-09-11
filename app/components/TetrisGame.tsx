"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    TETRIS_COLS,
    TETRIS_ROWS,
    TETROMINO_SHAPES,
    TETROMINO_TYPES,
    createEmptyBoard,
    createInitialState,
    gravityMs,
    hardDrop,
    movePiece,
    resolveBoard,
    rotatePiece,
    stepGame,
    type TetrisState,
    type TetrominoType,
} from "@/lib/tetris";
import { submitGameScoreAction } from "@/app/actions";

type Phase = "idle" | "playing" | "paused" | "over";

function shuffle<T>(items: T[], rand: () => number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export default function TetrisGame({ isLoggedIn }: { isLoggedIn: boolean }) {
    const router = useRouter();

    const [game, setGame] = useState<TetrisState | null>(null);
    const [phase, setPhase] = useState<Phase>("idle");
    const [submitResult, setSubmitResult] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Refs mirror the React state so event handlers and effects can act on the
    // latest values synchronously. They are never read during render.
    const gameRef = useRef<TetrisState | null>(null);
    const phaseRef = useRef<Phase>("idle");
    const bagRef = useRef<TetrominoType[]>([]);
    const playedMsRef = useRef(0);
    const runStartRef = useRef(0);
    const submittedRef = useRef(false);

    const setPhaseBoth = useCallback((next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
    }, []);

    // Draws pieces from a shuffled 7-bag so every seven pieces contain one of
    // each shape (standard Tetris distribution).
    const sample = useCallback((): TetrominoType => {
        if (bagRef.current.length === 0) {
            bagRef.current = shuffle([...TETROMINO_TYPES], Math.random);
        }
        return bagRef.current.pop() as TetrominoType;
    }, []);

    const submitScore = useCallback(
        async (score: number, playedSeconds: number) => {
            setSubmitting(true);
            try {
                const res = await submitGameScoreAction(
                    "tetris",
                    score,
                    playedSeconds,
                );
                if (res.ok) {
                    setSubmitResult(
                        res.isNewBest
                            ? "New high score! It made the leaderboard."
                            : "Score recorded. Not your best yet.",
                    );
                    router.refresh();
                } else if (res.error) {
                    setSubmitResult(`Couldn't save your score: ${res.error}`);
                }
            } catch {
                setSubmitResult("Couldn't save your score.");
            } finally {
                setSubmitting(false);
            }
        },
        [router],
    );

    // Applies an engine result: stores it, and when the well tops out, ends
    // the game and submits the final score once.
    const commit = useCallback(
        (next: TetrisState) => {
            gameRef.current = next;
            setGame(next);
            if (next.over && !submittedRef.current && isLoggedIn) {
                submittedRef.current = true;
                setPhaseBoth("over");
                playedMsRef.current += Date.now() - runStartRef.current;
                const playedSeconds = Math.max(
                    1,
                    Math.round(playedMsRef.current / 1000),
                );
                void submitScore(next.score, playedSeconds);
            }
        },
        [setPhaseBoth, submitScore, isLoggedIn],
    );

    const start = useCallback(() => {
        submittedRef.current = false;
        playedMsRef.current = 0;
        runStartRef.current = Date.now();
        setSubmitResult("");
        commit(createInitialState(sample));
        setPhaseBoth("playing");
    }, [sample, commit, setPhaseBoth]);

    const togglePause = useCallback(() => {
        if (phaseRef.current === "playing") {
            playedMsRef.current += Date.now() - runStartRef.current;
            setPhaseBoth("paused");
        } else if (phaseRef.current === "paused") {
            runStartRef.current = Date.now();
            setPhaseBoth("playing");
        }
    }, [setPhaseBoth]);

    const move = useCallback(
        (dx: number, dy: number) => {
            const prev = gameRef.current;
            if (!prev || phaseRef.current !== "playing") return;
            commit(movePiece(prev, dx, dy));
        },
        [commit],
    );

    const rotate = useCallback(() => {
        const prev = gameRef.current;
        if (!prev || phaseRef.current !== "playing") return;
        commit(rotatePiece(prev));
    }, [commit]);

    const dropHard = useCallback(() => {
        const prev = gameRef.current;
        if (!prev || phaseRef.current !== "playing") return;
        commit(hardDrop(prev, sample));
    }, [commit, sample]);

    const handleKey = useCallback(
        (event: KeyboardEvent) => {
            const actionKeys = new Set([
                "ArrowLeft",
                "ArrowRight",
                "ArrowDown",
                "ArrowUp",
                " ",
            ]);
            if (actionKeys.has(event.key)) event.preventDefault();

            if (phaseRef.current === "idle") {
                if (actionKeys.has(event.key) || event.key === "Enter") {
                    start();
                }
                return;
            }

            if (phaseRef.current === "over") {
                if (
                    event.key === " " ||
                    event.key === "Enter" ||
                    event.key.toLowerCase() === "r"
                ) {
                    start();
                }
                return;
            }

            if (phaseRef.current === "paused") {
                if (event.key.toLowerCase() === "p") togglePause();
                return;
            }

            switch (event.key) {
                case "ArrowLeft":
                    move(-1, 0);
                    break;
                case "ArrowRight":
                    move(1, 0);
                    break;
                case "ArrowDown":
                    move(0, 1);
                    break;
                case "ArrowUp":
                case "x":
                case "X":
                    rotate();
                    break;
                case " ":
                    dropHard();
                    break;
                case "p":
                case "P":
                    togglePause();
                    break;
                default:
                    break;
            }
        },
        [start, togglePause, move, rotate, dropHard],
    );

    useEffect(() => {
        const handler = (event: KeyboardEvent) => handleKey(event);
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleKey]);

    const level = game?.level ?? 1;
    const running = phase === "playing";

    // Gravity loop; re-created when the player starts/pauses or levels up.
    useEffect(() => {
        if (!running) return;
        const id = window.setInterval(() => {
            const prev = gameRef.current;
            if (prev && !prev.over) commit(stepGame(prev, sample));
        }, gravityMs(level));
        return () => window.clearInterval(id);
    }, [running, level, commit, sample]);

    const board = game ? resolveBoard(game) : createEmptyBoard();
    const nextType = game?.next ?? null;
    const score = game?.score ?? 0;
    const lines = game?.lines ?? 0;

    return (
        <div className="box">
            <div className="box-title" style={{ background: "#2c4d80" }}>
                Tetris
            </div>
            <div className="box-content flex flex-col items-center gap-3 md:flex-row md:items-start md:justify-center">
                <div className="relative">
                    <div
                        className="tetris-board"
                        style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${TETRIS_COLS}, 1fr)`,
                            gridTemplateRows: `repeat(${TETRIS_ROWS}, 1fr)`,
                        }}
                    >
                        {board.map((row, y) =>
                            row.map((cell, x) => (
                                <div
                                    key={`${y}-${x}`}
                                    className={`tetris-cell${cell ? " tetris-cell--filled" : ""}`}
                                    data-type={cell ?? ""}
                                />
                            )),
                        )}
                    </div>

                    {phase === "idle" && game === null && (
                        <div className="tetris-overlay">
                            <div className="tetris-overlay-title">TETRIS</div>
                            <p>Press any arrow key to start.</p>
                            {!isLoggedIn && (
                                <p className="tetris-overlay-hint">
                                    Log in to save your score.
                                </p>
                            )}
                            <button
                                type="button"
                                className="btn"
                                onClick={start}
                            >
                                Start Game
                            </button>
                        </div>
                    )}

                    {phase === "paused" && (
                        <div className="tetris-overlay">
                            <div className="tetris-overlay-title">Paused</div>
                            <p>Press P to resume.</p>
                            <button
                                type="button"
                                className="btn"
                                onClick={togglePause}
                            >
                                Resume
                            </button>
                        </div>
                    )}

                    {phase === "over" && (
                        <div className="tetris-overlay">
                            <div className="tetris-overlay-title">Game Over</div>
                            <p>Score: {score}</p>
                            <button
                                type="button"
                                className="btn"
                                onClick={start}
                                disabled={submitting}
                            >
                                Play Again
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex w-full flex-col gap-3 md:w-[170px]">
                    <div className="tetris-panel">
                        <div className="tetris-panel-label">Score</div>
                        <div className="tetris-panel-value">{score}</div>
                    </div>
                    <div className="tetris-panel">
                        <div className="tetris-panel-label">Lines</div>
                        <div className="tetris-panel-value">{lines}</div>
                    </div>
                    <div className="tetris-panel">
                        <div className="tetris-panel-label">Level</div>
                        <div className="tetris-panel-value">{level}</div>
                    </div>
                    <div className="tetris-panel">
                        <div className="tetris-panel-label">Next</div>
                        <div className="mt-1 flex justify-center">
                            <div
                                className="tetris-preview"
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(4, minmax(0, 1fr))",
                                }}
                            >
                                {Array.from({ length: 16 }, (_, i) => {
                                    const r = Math.floor(i / 4);
                                    const c = i % 4;
                                    const shape = nextType
                                        ? TETROMINO_SHAPES[nextType]
                                        : [];
                                    const filled = shape[r]?.[c];
                                    return (
                                        <div
                                            key={i}
                                            className={`tetris-cell tetris-cell--preview${filled ? " tetris-cell--filled" : ""}`}
                                            data-type={filled ? nextType : ""}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {(phase === "playing" || phase === "paused") && (
                        <div className="tetris-controls">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={togglePause}
                            >
                                {phase === "playing" ? "Pause" : "Resume"}
                            </button>
                        </div>
                    )}

                    <div className="tetris-controls">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => move(-1, 0)}
                            aria-label="Move left"
                            disabled={phase !== "playing"}
                        >
                            ←
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={rotate}
                            aria-label="Rotate"
                            disabled={phase !== "playing"}
                        >
                            ↻
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => move(1, 0)}
                            aria-label="Move right"
                            disabled={phase !== "playing"}
                        >
                            →
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => move(0, 1)}
                            aria-label="Soft drop"
                            disabled={phase !== "playing"}
                        >
                            ↓
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={dropHard}
                            aria-label="Hard drop"
                            disabled={phase !== "playing"}
                        >
                            ⤓
                        </button>
                    </div>

                    {submitting && (
                        <p className="tetris-caption">Saving your score...</p>
                    )}
                    {submitResult && (
                        <p className="tetris-caption">{submitResult}</p>
                    )}
                    {isLoggedIn && phase === "idle" && (
                        <p className="tetris-caption">
                            Score clears register on the all-users leaderboard.
                        </p>
                    )}
                    {!isLoggedIn && (
                        <p className="tetris-caption">
                            <Link href="/login" className="no-underline">
                                <span className="text-[#003399] underline">
                                    Log in
                                </span>
                            </Link>{" "}
                            to play for the leaderboard.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}