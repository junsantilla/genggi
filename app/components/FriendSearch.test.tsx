import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FriendSearch, { type FriendEntry } from "./FriendSearch";

vi.mock("@/app/actions", () => ({
    removeFriendAction: vi.fn(),
}));

const mockFriends: FriendEntry[] = [
    {
        _id: "user-1",
        username: "wizxerox",
        displayName: "Wiz Xerox",
        photo: null,
        friendshipId: "fs-1",
    },
    {
        _id: "user-2",
        username: "arkelodon",
        displayName: "arkelodon",
        photo: null,
        friendshipId: "fs-2",
    },
];

describe("FriendSearch component", () => {
    it("renders all friends by default", () => {
        render(<FriendSearch friends={mockFriends} />);
        expect(screen.getByText("Wiz Xerox")).toBeInTheDocument();
        expect(screen.getByText("arkelodon")).toBeInTheDocument();
        expect(screen.getAllByText("Message")).toHaveLength(2);
        expect(screen.getAllByText("Remove")).toHaveLength(2);
    });

    it("filters friends as the user types", async () => {
        const user = userEvent.setup();
        render(<FriendSearch friends={mockFriends} />);

        const input = screen.getByPlaceholderText("Search your friends…");
        await user.type(input, "wiz");

        expect(screen.getByText("Wiz Xerox")).toBeInTheDocument();
        expect(screen.queryByText("arkelodon")).not.toBeInTheDocument();
    });

    it("shows empty message when query does not match any friend", async () => {
        const user = userEvent.setup();
        render(<FriendSearch friends={mockFriends} />);

        const input = screen.getByPlaceholderText("Search your friends…");
        await user.type(input, "wow");

        expect(screen.queryByText(/0 matches/)).not.toBeInTheDocument();
        expect(screen.getByText("No friends match “wow”.")).toBeInTheDocument();
        expect(screen.queryByText("Wiz Xerox")).not.toBeInTheDocument();
        expect(screen.queryByText("arkelodon")).not.toBeInTheDocument();
    });

    it("shows fallback message when there are no friends", () => {
        render(<FriendSearch friends={[]} />);
        expect(screen.getByText("No friends yet.")).toBeInTheDocument();
    });
});
