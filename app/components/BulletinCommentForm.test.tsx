import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulletinCommentForm from "./BulletinCommentForm";
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
];

function renderForm(friendList?: MentionFriend[]) {
  render(
    <BulletinCommentForm postId="post1" friends={friendList} />,
  );
  const textarea = screen.getByLabelText("Write a comment");
  return { textarea };
}

describe("BulletinCommentForm @mention autocomplete", () => {
  it("shows friend suggestions after typing @ and filters by name", async () => {
    const user = userEvent.setup();
    const { textarea } = renderForm(friends);

    await user.type(textarea, "@");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);

    await user.type(textarea, "ja");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("@jane");
  });

  it("inserts the selected mention on Enter with a trailing space", async () => {
    const user = userEvent.setup();
    const { textarea } = renderForm(friends);

    await user.type(textarea, "@jo{Enter}");
    expect(textarea).toHaveValue("@john ");
  });

  it("closes on Escape without inserting", async () => {
    const user = userEvent.setup();
    const { textarea } = renderForm(friends);

    await user.type(textarea, "@");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(textarea).toHaveValue("@");
  });

  it("renders no autocomplete when no friends are provided", async () => {
    const user = userEvent.setup();
    const { textarea } = renderForm();

    await user.type(textarea, "@");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
