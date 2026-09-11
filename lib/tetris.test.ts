import { describe, expect, it } from "vitest";
import {
    TETRIS_COLS,
    TETRIS_ROWS,
    TETROMINO_SHAPES,
    clearFullLines,
    collides,
    createEmptyBoard,
    createInitialState,
    gravityMs,
    hardDrop,
    levelForLines,
    lockPiece,
    movePiece,
    resolveBoard,
    rotateCW,
    rotatePiece,
    scoreForLines,
    spawnPiece,
    stepGame,
    type TetrisState,
    type TetrominoType,
} from "./tetris";

const SAMPLE: () => TetrominoType = () => "I";

describe("createEmptyBoard", () => {
    it("builds a ROWS x COLS grid of nulls", () => {
        const board = createEmptyBoard();
        expect(board).toHaveLength(TETRIS_ROWS);
        for (const row of board) {
            expect(row).toHaveLength(TETRIS_COLS);
            expect(row.every((cell) => cell === null)).toBe(true);
        }
    });
});

describe("rotateCW", () => {
    it("rotates the I tetromino horizontal -> vertical", () => {
        const rotated = rotateCW(TETROMINO_SHAPES.I);
        expect(rotated[0]).toEqual([0, 0, 1, 0]);
        expect(rotated[1]).toEqual([0, 0, 1, 0]);
        expect(rotated[2]).toEqual([0, 0, 1, 0]);
        expect(rotated[3]).toEqual([0, 0, 1, 0]);
    });

    it("is a no-op for the O tetromino", () => {
        expect(rotateCW(TETROMINO_SHAPES.O)).toEqual(TETROMINO_SHAPES.O);
    });
});

describe("spawnPiece", () => {
    it("centers 3-wide pieces", () => {
        for (const type of ["T", "S", "Z", "J", "L"] as const) {
            const piece = spawnPiece(type);
            expect(piece.x).toBe(Math.floor((TETRIS_COLS - 3) / 2));
        }
    });
});

describe("collides", () => {
    it("rejects pieces past the walls and floor", () => {
        const board = createEmptyBoard();
        const shape = TETROMINO_SHAPES.T;
        expect(collides(board, shape, -1, 0)).toBe(true);
        expect(collides(board, shape, TETRIS_COLS - 1, 0)).toBe(true);
        expect(collides(board, shape, 3, TETRIS_ROWS - 1)).toBe(true);
    });

    it("accepts spawn rows above the board", () => {
        const board = createEmptyBoard();
        expect(collides(board, TETROMINO_SHAPES.I, 3, -1)).toBe(false);
    });

    it("detects overlap with stacked blocks", () => {
        const board = createEmptyBoard();
        board[8][4] = "T";
        expect(collides(board, TETROMINO_SHAPES.T, 3, 8)).toBe(true);
        expect(collides(board, TETROMINO_SHAPES.T, 3, 6)).toBe(false);
    });
});

describe("clearFullLines", () => {
    it("removes full rows and shifts the rest to the bottom", () => {
        const board = createEmptyBoard();
        board[18] = board[18].map(() => "I" as const);
        board[19] = board[19].map(() => "O" as const);
        board[17][5] = "T";
        const { board: result, cleared } = clearFullLines(board);
        expect(cleared).toBe(2);
        expect(result[19][5]).toBe("T");
        expect(result[18][5]).toBe(null);
        expect(result[0].every((cell) => cell === null)).toBe(true);
    });

    it("clears nothing on empty/partial boards", () => {
        const board = createEmptyBoard();
        board[0][0] = "J";
        const { board: result, cleared } = clearFullLines(board);
        expect(cleared).toBe(0);
        expect(result[0][0]).toBe("J");
    });
});

describe("scoreForLines / levelForLines / gravityMs", () => {
    it("scores classic multipliers", () => {
        expect(scoreForLines(0, 1)).toBe(0);
        expect(scoreForLines(1, 1)).toBe(100);
        expect(scoreForLines(2, 1)).toBe(300);
        expect(scoreForLines(3, 1)).toBe(500);
        expect(scoreForLines(4, 1)).toBe(800);
        expect(scoreForLines(1, 5)).toBe(500);
    });

    it("levels up every 10 lines", () => {
        expect(levelForLines(0)).toBe(1);
        expect(levelForLines(9)).toBe(1);
        expect(levelForLines(10)).toBe(2);
        expect(levelForLines(42)).toBe(5);
    });

    it("speeds up as levels rise, floored at 100ms", () => {
        expect(gravityMs(1)).toBe(800);
        expect(gravityMs(2)).toBe(730);
        expect(gravityMs(20)).toBe(100);
    });
});

describe("movePiece", () => {
    it("moves within bounds and refuses to leave them", () => {
        const state = createInitialState(SAMPLE);
        const left = movePiece(state, -1, 0);
        expect(left.active!.x).toBe(state.active!.x - 1);

        const wall = movePiece(state, -10, 0);
        expect(wall).toEqual(state);
    });
});

describe("rotatePiece", () => {
    it("rotates and applies a wall kick", () => {
        const state = createInitialState(() => "I");
        const rotated = rotatePiece(state);
        expect(rotated.active!.shape[0]).toEqual([0, 0, 1, 0]);
    });
});

describe("stepGame", () => {
    it("falls one row per tick", () => {
        const state = createInitialState(SAMPLE);
        const stepped = stepGame(state, SAMPLE);
        expect(stepped.active!.y).toBe(state.active!.y + 1);
    });

    it("locks at the floor, scores nothing, and spawns the next piece", () => {
        const state = createInitialState(SAMPLE);
        let current = state;
        for (let i = 0; i < 100; i++) {
            const next = stepGame(current, SAMPLE);
            if (next.active === null) break;
            current = next;
        }
        // SAMPLE always returns "I": the piece locks at y = ROWS - shapeW.
        expect(current.active).not.toBeNull();
        expect(current.lines).toBe(0);
        expect(current.score).toBe(0);
        expect(current.active!.type).toBe("I");
    });

    it("ends the game when a new piece cannot spawn", () => {
        // Leave only column 3-6 of row 1 filled: an I spawn there collides.
        const board = createEmptyBoard();
        for (const col of [3, 4, 5, 6]) board[1][col] = "I";
        const state: TetrisState = {
            board,
            active: null,
            next: "I",
            score: 0,
            lines: 0,
            level: 1,
            over: false,
        };
        const locked = lockPiece(state, SAMPLE);
        expect(locked.over).toBe(true);
    });
});

describe("hardDrop", () => {
    it("drops to the bottom, locks, and continues", () => {
        const state = createInitialState(SAMPLE);
        const dropped = hardDrop(state, SAMPLE);
        expect(dropped.over).toBe(false);
        expect(dropped.active!.type).toBe("I");
        // An I piece lands on rows 16-19, leaving row 15 empty.
        const locked = resolveBoard(dropped);
        expect(locked[15].every((cell) => cell === null)).toBe(true);
    });

    it("clears a full row dropped into", () => {
        const state = createInitialState(SAMPLE);
        // Fill row 19 everywhere except columns 3-6, then drop an I there.
        for (const col of [0, 1, 2, 7, 8, 9]) {
            state.board[19][col] = "J";
        }
        const dropped = hardDrop(state, SAMPLE);
        expect(dropped.lines).toBe(1);
        expect(dropped.score).toBe(100);
    });
});

describe("resolveBoard", () => {
    it("overlays the active piece on the static board", () => {
        const state = createInitialState(SAMPLE);
        const board = resolveBoard(state);
        const cells = state.active!.shape.flatMap((row, r) =>
            row.map((v, c) => [state.active!.x + c, state.active!.y + r, v]),
        );
        for (const [x, y, v] of cells) {
            if (!v || y < 0 || x < 0 || x >= TETRIS_COLS || y >= TETRIS_ROWS) continue;
            expect(board[y][x]).toBe("I");
        }
    });
});