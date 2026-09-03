import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageRecipientSearch from "./MessageRecipientSearch";
import type { MentionFriend } from "@/lib/types";

const friends: MentionFriend[] = [
    {
        _id: "1",
        username: "jdoe",
        displayName: "John Doe",
        firstName: "John",
        lastName: "Doe",
        photo: null,
    },
    {
        _id: "2",
        username: "janer",
        displayName: "Jane Roe",
        firstName: "Jane",
        lastName: "Roe",
        photo: null,
    },
];

describe("MessageRecipientSearch", () => {
    it("shows live suggestions matching username and display name", async () => {
        const user = userEvent.setup();
        render(<MessageRecipientSearch friends={friends} />);
        const input = screen.getByRole("textbox", {
            name: "Search friends to message",
        });

        await user.type(input, "jan");

        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.getAllByRole("option")).toHaveLength(1);
        expect(screen.getByRole("option")).toHaveTextContent("Jane Roe");
        expect(screen.getByRole("option")).toHaveTextContent("@janer");
    });

    it("matches first and last names and links to the selected username", async () => {
        const user = userEvent.setup();
        render(<MessageRecipientSearch friends={friends} />);
        const input = screen.getByRole("textbox", {
            name: "Search friends to message",
        });

        await user.type(input, "doe");
        const suggestion = screen.getByRole("option");

        expect(suggestion).toHaveTextContent("John Doe");
        expect(suggestion).toHaveAttribute("href", "/messages?to=jdoe");
    });

    it("shows no-match feedback and only searches the supplied friends", async () => {
        const user = userEvent.setup();
        render(<MessageRecipientSearch friends={friends} />);
        const input = screen.getByRole("textbox", {
            name: "Search friends to message",
        });

        await user.type(input, "nobody");

        expect(screen.getByText(/No friends match/)).toBeInTheDocument();
        expect(screen.queryAllByRole("option")).toHaveLength(0);
    });
});
