"use client";

import { getYouTubeVideoId } from "@/lib/utils";

const URL_PATTERN = /https?:\/\/[^\s<]+/gi;

export function findYouTubeVideoId(text: string): string | null {
    const matches = text.match(URL_PATTERN);
    if (!matches) return null;
    for (const match of matches) {
        const clean = match.replace(/[.,!?;:]+$/, "");
        const videoId = getYouTubeVideoId(clean);
        if (videoId) return videoId;
    }
    return null;
}

export function stripYouTubeLinks(text: string): string {
    return text.replace(URL_PATTERN, (match) => {
        const clean = match.replace(/[.,!?;:]+$/, "");
        return getYouTubeVideoId(clean) ? "" : match;
    });
}

export default function YouTubeLinkEmbed({ videoId }: { videoId: string }) {
    if (!videoId) return null;

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
