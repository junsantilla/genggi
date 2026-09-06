import { describe, expect, it } from "vitest";
import { escapeRegex } from "./utils";

describe("escapeRegex", () => {
    it("escapes regex special characters safely", () => {
        expect(escapeRegex("georgie paras +++ #")).toBe("georgie paras \\+\\+\\+ #");
        expect(escapeRegex("user (test) [abc] *?^${}|\\")).toBe("user \\(test\\) \\[abc\\] \\*\\?\\^\\$\\{\\}\\|\\\\");
    });

    it("leaves regular alphanumeric strings unchanged", () => {
        expect(escapeRegex("simple query 123")).toBe("simple query 123");
        expect(escapeRegex("")).toBe("");
    });
});
