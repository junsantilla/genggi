"use client";

import { getYouTubeVideoId } from "@/lib/utils";

const URL_PATTERN = /https?:\/\/[^\s<]+/gi;

function cleanUrl(value: string): string {
  return value.replace(/[.,!?;:]+$/, "");
}

export function findYouTubeVideoId(text: string): string | null {
  const matches = text.match(URL_PATTERN);
  if (!matches) return null;
  for (const match of matches) {
    const videoId = getYouTubeVideoId(cleanUrl(match));
    if (videoId) return videoId;
  }
  return null;
}

// Remove YouTube links from text so they aren't shown as plain text when the
// video is already embedded inline.
export function stripYouTubeLinks(text: string): string {
  const parts = text.split(URL_PATTERN);
  return parts
    .filter((part) => !getYouTubeVideoId(cleanUrl(part)))
    .join("")
    .replace(/\n{3,}/g, "\n\n");
}

export default function YouTubeLinkEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="mt-1.5">
      <div className="relative w-full aspect-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
          title="YouTube video player"
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}