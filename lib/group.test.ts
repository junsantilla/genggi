import { describe, expect, it } from "vitest";
import { mergeMemberFirst } from "./group";

function item(id: string) {
  return { _id: id };
}

describe("mergeMemberFirst", () => {
  it("lists member groups first, then others, capped at the limit", () => {
    const merged = mergeMemberFirst(
      [item("m1"), item("m2")],
      [item("o1"), item("o2"), item("o3")],
      5,
    );
    expect(merged.map((g) => g._id)).toEqual(["m1", "m2", "o1", "o2", "o3"]);
  });

  it("caps the list at the limit, keeping member groups", () => {
    const merged = mergeMemberFirst(
      [item("m1"), item("m2"), item("m3")],
      [item("o1"), item("o2")],
      5,
    );
    // Member groups take the first slots; only enough others fill the rest.
    expect(merged.map((g) => g._id)).toEqual(["m1", "m2", "m3", "o1", "o2"]);

    const capped = mergeMemberFirst(
      [item("m1"), item("m2")],
      [item("o1"), item("o2"), item("o3")],
      3,
    );
    expect(capped.map((g) => g._id)).toEqual(["m1", "m2", "o1"]);
  });

  it("falls back to other groups when there are no memberships", () => {
    const merged = mergeMemberFirst([], [item("o1"), item("o2")], 5);
    expect(merged.map((g) => g._id)).toEqual(["o1", "o2"]);
  });

  it("deduplicates groups that appear in both lists", () => {
    const merged = mergeMemberFirst([item("m1")], [item("m1"), item("o1")], 5);
    expect(merged.map((g) => g._id)).toEqual(["m1", "o1"]);
  });
});
