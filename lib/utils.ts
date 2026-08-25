import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

export function isYouTubeVideoId(value: unknown): value is string {
  return typeof value === "string" && YOUTUBE_VIDEO_ID_PATTERN.test(value)
}

export function getYouTubeVideoId(value: string): string | null {
  const input = value.trim()
  if (!input) return null
  if (isYouTubeVideoId(input)) return input

  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
  let videoId: string | null = null

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null
  } else if (hostname === "youtube.com" || hostname === "music.youtube.com") {
    const pathParts = url.pathname.split("/").filter(Boolean)
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v")
    } else if (["embed", "shorts", "live"].includes(pathParts[0] ?? "")) {
      videoId = pathParts[1] ?? null
    }
  }

  return videoId && isYouTubeVideoId(videoId) ? videoId : null
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
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
