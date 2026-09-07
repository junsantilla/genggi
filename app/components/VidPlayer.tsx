"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import type { SerializedVid } from "@/lib/types";

// Browsers block unmuted autoplay until the user has interacted with the
// page, so videos start muted. After the first click/tap/keypress anywhere,
// autoplay with sound is allowed — the same behavior Facebook and TikTok
// rely on.
let userInteracted = false;
const interactionListeners = new Set<() => void>();

function handleInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    for (const listener of interactionListeners) listener();
}

if (typeof window !== "undefined") {
    const passive = { passive: true } as AddEventListenerOptions;
    window.addEventListener("pointerdown", handleInteraction, passive);
    window.addEventListener("keydown", handleInteraction, passive);
    window.addEventListener("touchstart", handleInteraction, passive);
    window.addEventListener("wheel", handleInteraction, passive);
}

// HTML5 video player for a single Vid. Autoplays (muted until the user has
// interacted with the page) and loops when the slide becomes active; pauses
// when it leaves the screen. Only the active video in the feed plays, so
// multiple videos never sound/play at once.
export default function VidPlayer({
    vid,
    active,
    preload = "metadata",
}: {
    vid: SerializedVid;
    active: boolean;
    preload?: "none" | "metadata" | "auto";
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);
    // Landscape videos are shown uncropped (object-contain, vertically
    // centered) inside the portrait frame; portrait videos keep object-cover.
    const [fit, setFit] = useState<"cover" | "contain">("cover");

    // Once the user interacts with the page, unmute any video that is already
    // playing (Facebook-style), so the very first video gains sound too.
    useEffect(() => {
        const listener = () => {
            const video = videoRef.current;
            if (video && !video.paused && video.muted) {
                video.muted = false;
                setMuted(false);
            }
        };
        interactionListeners.add(listener);
        return () => {
            interactionListeners.delete(listener);
        };
    }, []);

    // Drive playback from the active flag. Playing state is derived from the
    // video element's own play/pause events below, never set synchronously in
    // this effect.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (!active) {
            video.pause();
            return;
        }
        // After the first interaction, start videos with sound like
        // Facebook/TikTok; if the browser still blocks it, retry muted.
        if (userInteracted && video.muted) {
            video.muted = false;
            setMuted(false);
        }
        video.play().catch(() => {
            if (!video.muted) {
                video.muted = true;
                setMuted(true);
                video.play().catch(() => {});
            }
        });
    }, [active]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }, []);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setMuted(video.muted);
    }, []);

    return (
        <div className="relative h-full w-full overflow-hidden bg-black">
            <video
                ref={videoRef}
                src={vid.videoUrl}
                poster={vid.thumbnailUrl ?? undefined}
                className={`h-full w-full ${
                    fit === "contain" ? "object-contain" : "object-cover"
                }`}
                // Controlled by state, not a hardcoded attribute: a static
                // `muted` prop would re-mute the video on every re-render
                // (e.g. progress updates), making unmute impossible.
                muted={muted}
                loop
                playsInline
                preload={preload}
                onLoadedMetadata={(event) => {
                    setReady(true);
                    const el = event.currentTarget;
                    setFit(el.videoWidth > el.videoHeight ? "contain" : "cover");
                    if (el.duration && !Number.isNaN(el.duration)) {
                        el.currentTime = 0;
                    }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(event) => {
                    const el = event.currentTarget;
                    if (el.duration && !Number.isNaN(el.duration)) {
                        setProgress(el.currentTime / el.duration);
                    }
                }}
                onClick={togglePlay}
                aria-label={
                    playing ? "Pause video" : "Play video"
                }
            />

            {/* Play/pause overlay */}
            <button
                type="button"
                onClick={togglePlay}
                className={`absolute inset-0 flex cursor-pointer items-center justify-center border-0 bg-transparent transition-opacity duration-200 ${
                    playing || !ready ? "opacity-0 hover:opacity-100" : "opacity-100"
                }`}
                aria-label={playing ? "Pause video" : "Play video"}
                title={playing ? "Pause" : "Play"}
            >
                {!playing && (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
                        <Play size={30} className="ml-1" aria-hidden="true" />
                    </span>
                )}
            </button>

            {/* Progress bar */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                <div
                    className="h-full bg-[#cc3399] transition-[width] duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
            </div>

            {/* Mute toggle. Positioned top-right, clear of VidCard's bottom
                overlay, and z-20 so it always sits above the card layer. */}
            <button
                type="button"
                onClick={toggleMute}
                className="absolute right-3 top-3 z-20 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-black/50 text-white hover:bg-black/70"
                aria-label={muted ? "Unmute video" : "Mute video"}
                title={muted ? "Unmute" : "Mute"}
            >
                {muted ? (
                    <VolumeX size={17} aria-hidden="true" />
                ) : (
                    <Volume2 size={17} aria-hidden="true" />
                )}
            </button>
        </div>
    );
}