import { describe, expect, it } from "vitest";
import { mergeFeedPage } from "./bulletin";
import type { SerializedBulletinPost } from "./types";

function post(
    id: string,
    createdAt: string,
    groupId?: string
): SerializedBulletinPost {
    return {
        _id: id,
        authorId: "author-1",
        body: "body",
        visibility: "public",
        photo: null,
        createdAt,
        author: {
            _id: "author-1",
            username: "ann",
            displayName: "Ann",
            photo: null,
        },
        reactions: [],
        myReaction: null,
        comments: [],
        ...(groupId ? { groupId } : {}),
    };
}

describe("mergeFeedPage", () => {
    it("merges bulletin and group posts newest first, keeping groupId", () => {
        const page = mergeFeedPage(
            [
                post("b1", "2026-09-01T00:00:00.000Z"),
                post("g1", "2026-09-02T00:00:00.000Z", "group-1"),
                post("b2", "2026-09-03T00:00:00.000Z"),
            ],
            10
        );

        expect(page.posts.map((p) => p._id)).toEqual(["b2", "g1", "b1"]);
        expect(page.posts[1].groupId).toBe("group-1");
        expect(page.posts[0].groupId).toBeUndefined();
        expect(page.nextCursor).toBeNull();
    });

    it("breaks timestamp ties by descending id", () => {
        const when = "2026-09-01T00:00:00.000Z";
        const page = mergeFeedPage(
            [post("b1", when), post("b2", when), post("b3", when)],
            10
        );

        expect(page.posts.map((p) => p._id)).toEqual(["b3", "b2", "b1"]);
    });

    it("returns a cursor that resumes the feed on the next page", () => {
        const all = [
            post("b1", "2026-09-01T00:00:00.000Z"),
            post("g1", "2026-09-02T00:00:00.000Z", "group-1"),
            post("b2", "2026-09-03T00:00:00.000Z"),
        ];

        const first = mergeFeedPage(all, 2);
        expect(first.posts.map((p) => p._id)).toEqual(["b2", "g1"]);

        const cursor = first.nextCursor;
        expect(cursor).toEqual({
            createdAt: "2026-09-02T00:00:00.000Z",
            _id: "g1",
        });
        if (!cursor) throw new Error("expected a next page cursor");

        // Both sources apply the cursor filter, so page two only sees what is
        // strictly older than the cursor.
        const rest = all.filter(
            (p) =>
                p.createdAt < cursor.createdAt ||
                (p.createdAt === cursor.createdAt && p._id < cursor._id)
        );
        const second = mergeFeedPage(rest, 2);

        expect(second.posts.map((p) => p._id)).toEqual(["b1"]);
        expect(second.nextCursor).toBeNull();
    });
});
