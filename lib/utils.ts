export function timeAgo(date: Date | string | number | undefined | null): string {
  if (!date) return "unknown";
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(date: Date | string | number | undefined | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOnline(lastActive: Date | string | undefined | null): boolean {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 5 * 60_000;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function padViews(n: number): string {
  return n.toString().padStart(6, "0");
}

export const GENDERS = ["", "Male", "Female", "Other"];
export const STATUSES = ["Single", "Taken", "It's Complicated", "Married", "Looking"];
export const ZODIACS = [
  "",
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
export const BODY_TYPES = ["", "Slim", "Average", "Athletic", "Curvy", "A few extra pounds"];
export const ORIENTATIONS = ["", "Straight", "Gay", "Lesbian", "Bisexual", "Other"];
