import { describe, expect, it } from "vitest";
import {
    isAllowedVideoExtension,
    isAllowedVideoMime,
    parseHashtags,
    parseVidCursor,
    qualifiesForView,
    validateVidMetadata,
} from "./vids";
import { formatCount } from "./utils";

describe("isAllowedVideoMime", () => {
    it("accepts supported video MIME types case-insensitively", () => {
        expect(isAllowedVideoMime("video/mp4")).toBe(true);
        expect(isAllowedVideoMime("video/quicktime")).toBe(true);
        expect(isAllowedVideoMime("video/webm")).toBe(true);
        expect(isAllowedVideoMime("Video/MP4")).toBe(true);
    });

    it("rejects unsupported types", () => {
        expect(isAllowedVideoMime("image/png")).toBe(false);
        expect(isAllowedVideoMime("application/octet-stream")).toBe(false);
        expect(isAllowedVideoMime("")).toBe(false);
        expect(isAllowedVideoMime(null)).toBe(false);
        expect(isAllowedVideoMime("video/avi")).toBe(false);
    });
});

describe("isAllowedVideoExtension", () => {
    it("accepts supported extensions", () => {
        expect(isAllowedVideoExtension("clip.mp4")).toBe(true);
        expect(isAllowedVideoExtension("CLIP.MOV")).toBe(true);
        expect(isAllowedVideoExtension("video.webm")).toBe(true);
        expect(isAllowedVideoExtension("video.mkv")).toBe(true);
    });

    it("rejects everything else", () => {
        expect(isAllowedVideoExtension("clip.exe")).toBe(false);
        expect(isAllowedVideoExtension("clip.png")).toBe(false);
        expect(isAllowedVideoExtension("noextension")).toBe(false);
        expect(isAllowedVideoExtension("")).toBe(false);
    });
});

describe("parseHashtags", () => {
    it("extracts unique normalized hashtags from a caption", () => {
        expect(parseHashtags("hello #Fun times #fun again #nested#tag"))
            .toEqual(["fun", "nested", "tag"]);
        expect(parseHashtags("no tags here")).toEqual([]);
        expect(parseHashtags("#only")).toEqual(["only"]);
    });

    it("caps tag count and length", () => {
        const tags = parseHashtags(
            "#one #two #three #four #five #six #seven #eight #nine #ten #eleven",
            5,
        );
        expect(tags).toHaveLength(5);
        expect(parseHashtags(`#${"a".repeat(50)}`, 10, 30)[0]).toBe(
            "a".repeat(30),
        );
    });

    it("deduplicates case-insensitively", () => {
        expect(parseHashtags("#Cat #cat #CAT")).toEqual(["cat"]);
    });
});

describe("validateVidMetadata", () => {
    it("accepts sane playback metadata", () => {
        const result = validateVidMetadata(12.5, 1080, 1920);
        expect(result).toEqual({
            ok: true,
            duration: 12.5,
            width: 1080,
            height: 1920,
        });
    });

    it("rejects missing, negative, or absurd values", () => {
        expect(validateVidMetadata(0, 1080, 1920).ok).toBe(false);
        expect(validateVidMetadata(-3, 1080, 1920).ok).toBe(false);
        expect(validateVidMetadata(12.5, -1, 1920).ok).toBe(false);
        expect(validateVidMetadata(12.5, 1080.5, 1920).ok).toBe(false);
        expect(validateVidMetadata(12.5, 1080, 99999).ok).toBe(false);
        expect(validateVidMetadata(7200, 1080, 1920).ok).toBe(false);
        expect(validateVidMetadata("abc", 1080, 1920).ok).toBe(false);
        expect(validateVidMetadata(undefined, undefined, undefined).ok).toBe(
            false,
        );
    });
});

describe("qualifiesForView", () => {
    it("counts after 2 seconds regardless of duration", () => {
        expect(qualifiesForView(2, 60)).toBe(true);
        expect(qualifiesForView(2.5, 120)).toBe(true);
    });

    it("counts at 50% of a short video", () => {
        expect(qualifiesForView(1, 2)).toBe(true);
        expect(qualifiesForView(1.5, 3)).toBe(true);
    });

    it("does not count below both thresholds", () => {
        expect(qualifiesForView(0, 60)).toBe(false);
        expect(qualifiesForView(1.9, 60)).toBe(false);
        expect(qualifiesForView(1, 3)).toBe(false); // 33% < 50%, < 2s
    });

    it("rejects garbage input", () => {
        expect(qualifiesForView(-1, 60)).toBe(false);
        expect(qualifiesForView(5, 0)).toBe(false);
        expect(qualifiesForView("lots", 60)).toBe(false);
        expect(qualifiesForView(Number.NaN, 60)).toBe(false);
        expect(qualifiesForView(undefined, undefined)).toBe(false);
    });
});

describe("parseVidCursor", () => {
    it("parses a valid cursor", () => {
        const oid = "507f1f77bcf86cd799439011";
        const cursor = parseVidCursor({ createdAt: "2026-01-01T00:00:00.000Z", _id: oid });
        expect(cursor).not.toBeNull();
        expect(cursor!.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
        expect(cursor!._id.toString()).toBe(oid);
    });

    it("returns null for null/undefined/invalid cursors", () => {
        expect(parseVidCursor(null)).toBeNull();
        expect(parseVidCursor(undefined)).toBeNull();
        expect(parseVidCursor({ createdAt: "not-a-date", _id: "507f1f77bcf86cd799439011" })).toBeNull();
        expect(parseVidCursor({ createdAt: "2026-01-01T00:00:00.000Z", _id: "not-an-object-id" })).toBeNull();
    });
});

describe("formatCount", () => {
    it("formats compact counts", () => {
        expect(formatCount(0)).toBe("0");
        expect(formatCount(999)).toBe("999");
        expect(formatCount(1200)).toBe("1.2K");
        expect(formatCount(10000)).toBe("10K");
        expect(formatCount(999999)).toBe("1000K");
        expect(formatCount(1500000)).toBe("1.5M");
    });

    it("clamps negatives and floors decimals", () => {
        expect(formatCount(-5)).toBe("0");
        expect(formatCount(1.9)).toBe("1");
    });
});