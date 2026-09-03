export const RESERVED_USERNAMES = [
    "_next",
    "about",
    "admin",
    "api",
    "bulletin",
    "chatboxes",
    "edit",
    "forgot-password",
    "friends",
    "groups",
    "layouts",
    "login",
    "members",
    "messages",
    "notifications",
    "privacy",
    "report-bug",
    "reset-password",
    "search",
    "settings",
    "signup",
    "terms",
    "u",
    "verify-email",
] as const;

const RESERVED_USERNAME_SET = new Set<string>(RESERVED_USERNAMES);

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
}

export function isReservedUsername(value: string): boolean {
    return RESERVED_USERNAME_SET.has(normalizeUsername(value));
}

export function validateUsername(value: string): string | null {
    const username = normalizeUsername(value);

    if (!username) return "Username is required.";
    if (!USERNAME_PATTERN.test(username)) {
        return "Username must be 3-20 characters (letters, numbers, underscore).";
    }
    if (isReservedUsername(username)) {
        return "That username is reserved for a site route. Please choose another.";
    }

    return null;
}
