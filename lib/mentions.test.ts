import { describe, it, expect } from "vitest";
import { extractMentionedUsernames } from "./mentions";

describe("extractMentionedUsernames", () => {
  it("finds @usernames at word starts", () => {
    expect(extractMentionedUsernames("Hey @john! Check out @jane")).toEqual([
      "john",
      "jane",
    ]);
  });

  it("dedupes and lowercases matches", () => {
    expect(extractMentionedUsernames("@John @john")).toEqual(["john"]);
  });

  it("ignores emails and doubled @", () => {
    expect(extractMentionedUsernames("mail me at user@example.com @@nope")).toEqual(
      [],
    );
  });

  it("requires at least 3 characters", () => {
    expect(extractMentionedUsernames("hi @a and @abc")).toEqual(["abc"]);
  });

  it("returns nothing for plain text", () => {
    expect(extractMentionedUsernames("no mentions here")).toEqual([]);
  });
});
