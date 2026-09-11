import { describe, expect, it } from "vitest";
import {
    GAME_MAX_SCORE,
    GAME_MIN_PLAY_SECONDS,
    normalizePlaySeconds,
    normalizeTetrisScore,
    parseGameScoreCursor,
} from "./games";

describe("normalizeTetrisScore", () => {
    it("accepts integer scores in range", () => {
        expect(normalizeTetrisScore(0)).toBe(0);
        expect(normalizeTetrisScore(100)).toBe(100);
        expect(normalizeTetrisScore(GAME_MAX_SCORE)).toBe(GAME_MAX_SCORE);
    });

    it("rejects out-of-range and non-integer values", () => {
        expect(normalizeTetrisScore(-1)).toBeNull();
        expect(normalizeTetrisScore(GAME_MAX_SCORE + 1)).toBeNull();
        expect(normalizeTetrisScore(12.5)).toBeNull();
        expect(normalizeTetrisScore(Number.NaN)).toBeNull();
        expect(normalizeTetrisScore(Number.POSITIVE_INFINITY)).toBeNull();
        expect(normalizeTetrisScore("100")).toBeNull();
        expect(normalizeTetrisScore(null)).toBeNull();
        expect(normalizeTetrisScore(undefined)).toBeNull();
    });
});

describe("normalizePlaySeconds", () => {
    it("accepts play times at or above the minimum", () => {
        expect(normalizePlaySeconds(GAME_MIN_PLAY_SECONDS)).toBe(
            GAME_MIN_PLAY_SECONDS,
        );
        expect(normalizePlaySeconds(60)).toBe(60);
    });

    it("rejects played-too-fast and garbage input", () => {
        expect(normalizePlaySeconds(GAME_MIN_PLAY_SECONDS - 1)).toBeNull();
        expect(normalizePlaySeconds(0)).toBeNull();
        expect(normalizePlaySeconds(-3)).toBeNull();
        expect(normalizePlaySeconds("10")).toBeNull();
        expect(normalizePlaySeconds(undefined)).toBeNull();
        expect(normalizePlaySeconds(Number.NaN)).toBeNull();
    });

    it("caps absurd play times", () => {
        expect(normalizePlaySeconds(999999)).toBe(3600);
    });
});

describe("parseGameScoreCursor", () => {
    it("parses a valid cursor", () => {
        const oid = "507f1f77bcf86cd799439011";
        const cursor = parseGameScoreCursor({
            bestScore: 1200,
            updatedAt: "2026-01-01T00:00:00.000Z",
            _id: oid,
        });
        expect(cursor).not.toBeNull();
        expect(cursor!.bestScore).toBe(1200);
        expect(cursor!._id).toBe(oid);
    });

    it("returns null for null/undefined/malformed cursors", () => {
        expect(parseGameScoreCursor(null)).toBeNull();
        expect(parseGameScoreCursor(undefined)).toBeNull();
        expect(
            parseGameScoreCursor({
                bestScore: Number.NaN,
                updatedAt: "2026-01-01T00:00:00.000Z",
                _id: "507f1f77bcf86cd799439011",
            }),
        ).toBeNull();
        expect(
            parseGameScoreCursor({
                bestScore: 1200,
                updatedAt: "not-a-date",
                _id: "507f1f77bcf86cd799439011",
            }),
        ).toBeNull();
        expect(
            parseGameScoreCursor({
                bestScore: 1200,
                updatedAt: "2026-01-01T00:00:00.000Z",
                _id: "not-an-object-id",
            }),
        ).toBeNull();
    });
});