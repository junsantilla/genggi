import { describe, expect, it } from "vitest";
import {
    isReservedUsername,
    normalizeUsername,
    validateUsername,
} from "./usernames";

describe("username rules", () => {
    it("normalizes usernames by trimming and lowercasing", () => {
        expect(normalizeUsername("  Junsantilla  ")).toBe("junsantilla");
    });

    it("reserves current Next.js route names case-insensitively", () => {
        for (const username of [
            "layouts",
            "login",
            "signup",
            "settings",
            "api",
            "_next",
        ]) {
            expect(isReservedUsername(username.toUpperCase())).toBe(true);
            expect(validateUsername(username)).toMatch(/reserved/);
        }
    });

    it("accepts a valid non-route username", () => {
        expect(validateUsername("  Jun_2000 ")).toBeNull();
    });

    it("rejects invalid username formats", () => {
        expect(validateUsername("ab")).toMatch(/3-20/);
        expect(validateUsername("not-valid")).toMatch(/3-20/);
    });
});
