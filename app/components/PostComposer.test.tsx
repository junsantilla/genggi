import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostComposer from "./PostComposer";
import type { MentionFriend } from "@/lib/types";

const friends: MentionFriend[] = [
  {
    _id: "a",
    username: "john",
    displayName: "John Doe",
    firstName: "John",
    lastName: "Doe",
    photo: null,
  },
  {
    _id: "b",
    username: "jane",
    displayName: "Jane Roe",
    firstName: "Jane",
    lastName: "Roe",
    photo: null,
  },
  {
    _id: "c",
    username: "sam",
    displayName: "Samantha",
    firstName: "Samantha",
    lastName: "Smith",
    photo: null,
  },
];

function renderComposer(friendList: MentionFriend[] = friends) {
  const action = vi.fn().mockResolvedValue({ ok: true });
  render(<PostComposer action={action} friends={friendList} showPrivacy />);
  const textarea = screen.getByPlaceholderText("What's on your mind?");
  return { action, textarea };
}

describe("PostComposer @mention autocomplete", () => {
  it("shows all friends after @ and filters by username", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "@");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    await user.type(textarea, "ja");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Jane Roe");
    expect(options[0]).toHaveTextContent("@jane");
  });

  it("filters by first name and last name", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    // "sm" only appears in Samantha's last name "Smith".
    await user.type(textarea, "@sm");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("@sam");
  });

  it("inserts the selected friend via keyboard navigation and keeps typing", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "@");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    expect(textarea).toHaveValue("@jane ");

    // Caret should be after the inserted mention so typing continues naturally.
    await user.type(textarea, "is cool");
    expect(textarea).toHaveValue("@jane is cool");
  });

  it("supports multiple mentions in one post", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "@jo{Enter}");
    await user.type(textarea, " and @sa{Enter}");
    expect(textarea).toHaveValue("@john  and @sam ");
  });

  it("closes on Escape without inserting", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "@");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(textarea).toHaveValue("@");
  });

  it("closes when the mention context is no longer active", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "@jo");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.type(textarea, " ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not open for emails", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "email me at user@example.com");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows a hint when no friends match", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "@zzz");
    expect(screen.getByText(/No friends match/)).toBeInTheDocument();
  });

  it("closes when clicking outside the composer", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer();

    await user.type(textarea, "@");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.click(screen.getByText("Add photo"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("renders no autocomplete when no friends are provided", async () => {
    const user = userEvent.setup();
    const { textarea } = renderComposer([]);

    await user.type(textarea, "@");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
