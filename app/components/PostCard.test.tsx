import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostCard from "./PostCard";
import type { BulletinPostCard } from "@/lib/types";

const { reactToBulletinPostAction } = vi.hoisted(() => ({
    reactToBulletinPostAction: vi.fn(),
}));

vi.mock("@/app/actions", () => ({
    reactToBulletinPostAction,
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
        expect(commentLink).not.toHaveTextContent("Comment");
        expect(commentLink.querySelector("svg")).toBeInTheDocument();
    });

    it("shows the selected reaction emoji in the reaction control", async () => {
        reactToBulletinPostAction.mockResolvedValue({
            ok: true,
            reactions: [{ type: "😂", count: 1 }],
            myReaction: "😂",
        });
        const user = userEvent.setup();
        render(<PostCard post={{ ...post, comments: [] }} />);

        await user.click(screen.getByRole("button", { name: "React to this post" }));
        await user.click(screen.getByTitle("😂"));

        await waitFor(() => {
            expect(
                screen.getByRole("button", {
                    name: "Change or remove reaction, 😂 1",
                }),
            ).toBeInTheDocument();
        });
        expect(screen.getByRole("button", { name: "Change or remove reaction, 😂 1" })).toHaveTextContent("😂");
    });

    it("displays only count when all reactions match the user's reaction (avoiding duplicate emoji)", () => {
        render(
            <PostCard
                post={{
                    ...post,
                    comments: [],
                    myReaction: "❤️",
                    reactions: [{ type: "❤️", count: 4 }],
                }}
            />,
        );

        // The count text next to the button should be just "4", not "❤️ 4"
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.queryByText("❤️ 4")).not.toBeInTheDocument();
    });

    it("displays emoji breakdown when there are multiple different reactions", () => {
        render(
            <PostCard
                post={{
                    ...post,
                    comments: [],
                    myReaction: "😂",
                    reactions: [
                        { type: "❤️", count: 1 },
                        { type: "😂", count: 1 },
                    ],
                }}
            />,
        );

        expect(screen.getByText("❤️ 1 · 😂 1")).toBeInTheDocument();
    });

    it("displays emoji with count when user has not reacted", () => {
        render(
            <PostCard
                post={{
                    ...post,
                    comments: [],
                    myReaction: null,
                    reactions: [{ type: "❤️", count: 4 }],
                }}
            />,
        );

        expect(screen.getByText("❤️ 4")).toBeInTheDocument();
    });
});

