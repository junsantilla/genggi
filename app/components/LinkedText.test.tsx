import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LinkedText from "./LinkedText";
import type { BulletinMentionRef } from "@/lib/types";

const mentions: BulletinMentionRef[] = [
  { userId: "a", username: "john" },
  { userId: "b", username: "jane" },
];

describe("LinkedText mentions", () => {
  it("renders validated mentions as links to the profile", () => {
    render(<LinkedText text="Hey @john check this out" mentions={mentions} />);
    const link = screen.getByRole("link", { name: "@john" });
    expect(link).toHaveAttribute("href", "/john");
  });

  it("keeps unvalidated @usernames as plain text", () => {
    render(<LinkedText text="Talk to @nobody later" mentions={mentions} />);
    expect(screen.queryByRole("link", { name: "@nobody" })).not.toBeInTheDocument();
    expect(screen.getByText("@nobody")).toBeInTheDocument();
  });

  it("renders nothing as a link when no mentions are provided", () => {
    render(<LinkedText text="Hello @john!" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("@john")).toBeInTheDocument();
  });

  it("does not linkify emails", () => {
    render(<LinkedText text="mail user@example.com" mentions={mentions} />);
    expect(screen.queryByRole("link", { name: "@example" })).not.toBeInTheDocument();
    expect(screen.getByText("mail user@example.com")).toBeInTheDocument();
  });

  it("still renders URLs as links alongside mentions", () => {
    render(
      <LinkedText
        text="See https://example.com with @jane"
        mentions={mentions}
      />,
    );
    expect(screen.getByRole("link", { name: "https://example.com" })).toHaveAttribute(
      "href",
      "https://example.com/",
    );
    expect(screen.getByRole("link", { name: "@jane" })).toHaveAttribute(
      "href",
      "/jane",
    );
  });
});
