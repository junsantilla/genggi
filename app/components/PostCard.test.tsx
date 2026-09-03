import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PostCard from "./PostCard";
import type { BulletinPostCard } from "@/lib/types";

vi.mock("@/app/actions", () => ({
    reactToBulletinPostAction: vi.fn(),
    reactToGroupPostAction: vi.fn(),
    reactToBulletinCommentAction: vi.fn(),
    createGroupCommentAction: vi.fn(),
    deleteBulletinPostAction: vi.fn(),
    deleteBulletinCommentAction: vi.fn(),
    deleteGroupPostAction: vi.fn(),
    deleteGroupCommentAction: vi.fn(),
}));

const post: BulletinPostCard = {
    _id: "post-1",
    authorId: "author-1",
    body: "A bulletin post",
    visibility: "public",
    createdAt: "2026-09-03T00:00:00.000Z",
    author: {
        _id: "author-1",
        username: "author",
        displayName: "Author",
        photo: null,
    },
    reactions: [],
    myReaction: null,
    comments: [
        {
            _id: "comment-1",
            authorId: "commenter-1",
            body: "A comment",
            createdAt: "2026-09-03T00:00:00.000Z",
            author: {
                _id: "commenter-1",
                username: "commenter",
                displayName: "Commenter",
                photo: null,
            },
        },
    ],
};

describe("PostCard bulletin comments", () => {
    it("hides comments by default and links to the post with the count", () => {
        render(<PostCard post={post} />);

        expect(screen.queryByText("A comment")).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "View comments (1)" })).toHaveAttribute(
            "href",
            "/bulletin/post-1#comments",
        );
        expect(screen.getByLabelText("1 comments")).toHaveTextContent("1");
    });

    it("shows comments when the card is used on the specific post page", () => {
        render(<PostCard post={post} showComments />);

        expect(screen.getByText("A comment")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "View comments (1)" })).toHaveAttribute(
            "href",
            "/bulletin/post-1#comments",
        );
        expect(document.getElementById("comments")).toBeInTheDocument();
    });

    it("does not show a comment count when there are no comments", () => {
        render(<PostCard post={{ ...post, comments: [] }} />);

        const commentLink = screen.getByRole("link", { name: "View comments" });
        expect(commentLink).toBeInTheDocument();
        expect(commentLink).toHaveTextContent("Comment");
        expect(commentLink.textContent).toBe("Comment");
    });
});
