"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isYouTubeVideoId } from "@/lib/utils";

const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";
const MAX_TITLE_LENGTH = 28;

type YouTubeCommand =
    | "playVideo"
    | "pauseVideo"
    | "mute"
    | "unMute"
    | "setVolume";
const DEFAULT_VOLUME = 80;

function truncateTitle(title: string): string {
    if (title.length <= MAX_TITLE_LENGTH) return title;
    return title.slice(0, MAX_TITLE_LENGTH) + "...";
}

export default function YouTubeMusicPlayer({ videoId }: { videoId?: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const soundUnlockedRef = useRef(false);
    const validVideoId = isYouTubeVideoId(videoId) ? videoId : null;
    const [playing, setPlaying] = useState(true);
    const [muted, setMuted] = useState(true);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);

    const sendCommand = useCallback(
        (command: YouTubeCommand, args: (string | number)[] = []) => {
            iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: "command", func: command, args }),
                YOUTUBE_ORIGIN,
            );
        },
        [],
    );

    useEffect(() => {
        if (!validVideoId) return;

        fetch(`/api/youtube-title?videoId=${encodeURIComponent(validVideoId)}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.title) setVideoTitle(data.title);
            })
            .catch(() => {});
    }, [validVideoId]);

    useEffect(() => {
        if (!validVideoId) return;

        let unlocked = false;
        const unlockSound = () => {
            if (unlocked) return;
            unlocked = true;
            soundUnlockedRef.current = true;
            document.removeEventListener("pointerdown", unlockSound);
            document.removeEventListener("mousemove", unlockSound);
            document.removeEventListener("keydown", unlockSound);
            sendCommand("setVolume", [DEFAULT_VOLUME]);
            sendCommand("unMute");
            sendCommand("playVideo");
            setMuted(false);
            setPlaying(true);
        };

        // Browsers require interaction before allowing audible playback. Mouse
        // movement is attempted too, although some browsers only accept a click,
        // tap, or key press as a valid activation gesture.
        document.addEventListener("pointerdown", unlockSound);
        document.addEventListener("mousemove", unlockSound);
        document.addEventListener("keydown", unlockSound);
        return () => {
            document.removeEventListener("pointerdown", unlockSound);
            document.removeEventListener("mousemove", unlockSound);
            document.removeEventListener("keydown", unlockSound);
        };
    }, [sendCommand, validVideoId]);

    if (!validVideoId) return null;

    const play = () => {
        sendCommand("playVideo");
        setPlaying(true);
    };

    const pause = () => {
        sendCommand("pauseVideo");
        setPlaying(false);
    };

    const toggleMuted = () => {
        sendCommand(muted ? "unMute" : "mute");
        if (muted) sendCommand("playVideo");
        setMuted((value) => !value);
        setPlaying(true);
    };

    const handleIframeLoad = () => {
        sendCommand("playVideo");
        if (soundUnlockedRef.current) {
            sendCommand("setVolume", [DEFAULT_VOLUME]);
            sendCommand("unMute");
        }
    };

    const safeVideoId = encodeURIComponent(validVideoId);
    const embedUrl = `${YOUTUBE_ORIGIN}/embed/${safeVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${safeVideoId}&playsinline=1&enablejsapi=1`;

    return (
        <div
            className="profile-music-player relative border border-[#99bbdd] bg-white p-1.5 mt-2"
            aria-label="Profile music player"
        >
            <iframe
                ref={iframeRef}
                src={embedUrl}
                title="Profile music"
                allow="autoplay; encrypted-media"
                className="absolute h-px w-px opacity-0 pointer-events-none"
                onLoad={handleIframeLoad}
            />
            <div className="flex flex-wrap items-center gap-1.5">
                <span
                    className="font-bold text-[#2c4d80] text-[13px] mr-auto"
                    title={videoTitle ?? "Profile music"}
                >
                    🎵{" "}
                    {videoTitle ? truncateTitle(videoTitle) : "Profile music"}
                </span>
                {playing ? (
                    <button
                        type="button"
                        className="btn btn-ghost text-[11px] px-2 py-0.5"
                        onClick={pause}
                    >
                        ❚❚
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn btn-ghost text-[11px] px-2 py-0.5"
                        onClick={play}
                    >
                        ▶
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-ghost text-[11px] px-2 py-0.5"
                    onClick={toggleMuted}
                >
                    {muted ? "🔊" : "🔇"}
                </button>
            </div>
            {/* {(muted || !playing) && (
                <p className="text-gray-500 text-[10px] m-0 mt-1">
                    {muted
                        ? "Starts muted, then sound unlocks on your first profile interaction."
                        : "Paused."}
                </p>
            )} */}
        </div>
    );
}
