"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { getMoreVidsAction } from "@/app/actions";
import type { SerializedVid } from "@/lib/types";
import { displayNameOrUsername } from "@/lib/utils";
import VidPlayer from "./VidPlayer";
import VidCard from "./VidCard";

// The immersive vertical feed: full-height slides with scroll snapping, only
// the visible slide playing, the next slide preloaded, and cursor-based
// infinite scrolling. Videos are never all downloaded at once — inactive
// slides only load metadata.
export default function VidsFeed({
    initialVideos,
    hasMore,
    isLoggedIn,
    currentUserId,
}: {
    initialVideos: SerializedVid[];
    hasMore: boolean;
    isLoggedIn: boolean;
    currentUserId?: string;
}) {
    const [videos, setVideos] = useState<SerializedVid[]>(initialVideos);
    const [more, setMore] = useState(hasMore);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");
    const [activeId, setActiveId] = useState<string | null>(
        initialVideos[0]?._id ?? null,
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const watchRef = useRef<{ vidId: string; startedAt: number; reported: boolean } | null>(null);

    const videosRef = useRef(videos);
    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    const reportView = useCallback((vidId: string) => {
        const watch = watchRef.current;
        if (!watch || watch.vidId !== vidId) return;
        const vid = videosRef.current.find((v) => v._id === vidId);
        if (!vid) return;
        const elapsed = (Date.now() - watch.startedAt) / 1000;
        const duration = vid.duration > 0 ? vid.duration : elapsed;
        fetch(`/api/vids/${vidId}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                watchedSeconds: Math.round(elapsed * 10) / 10,
                videoDuration: Math.round(duration * 10) / 10,
            }),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.counted) {
                    setVideos((prev) =>
                        prev.map((v) =>
                            v._id === vidId
                                ? { ...v, viewCount: v.viewCount + 1 }
                                : v,
                        ),
                    );
                }
            })
            .catch(() => {});
    }, []);

    // Track the active slide with an IntersectionObserver on the scroll
    // container; only one slide intersects at a time.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const slides = container.querySelectorAll<HTMLElement>("[data-vid-slide]");
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = (entry.target as HTMLElement).dataset.vidId;
                        if (id) setActiveId(id);
                    }
                }
            },
            { root: container, threshold: 0.6 },
        );
        slides.forEach((slide) => observer.observe(slide));
        return () => observer.disconnect();
    }, [videos]);

    // Report the watch when the active vid changes or the feed unmounts.
    useEffect(() => {
        const previous = watchRef.current;
        if (previous && previous.vidId !== activeId) {
            reportView(previous.vidId);
        }
        if (activeId) {
            watchRef.current = { vidId: activeId, startedAt: Date.now(), reported: false };
        } else {
            watchRef.current = null;
        }
        // Report the current watch when the component unmounts.
        return () => {
            if (watchRef.current) reportView(watchRef.current.vidId);
        };
    }, [activeId, reportView]);

    // Report the view early (>= 2 seconds) even if the user never scrolls away.
    useEffect(() => {
        if (!activeId) return;
        const watch = watchRef.current;
        if (!watch || watch.vidId !== activeId || watch.reported) return;
        const timer = window.setTimeout(() => {
            watchRef.current = { ...watchRef.current!, reported: true };
            reportView(activeId);
        }, 2000);
        return () => window.clearTimeout(timer);
    }, [activeId, reportView]);

    const loadMore = useCallback(async () => {
        if (loadingRef.current || !more) return;
        loadingRef.current = true;
        setLoadingMore(true);
        setError("");
        try {
            const last = videosRef.current[videosRef.current.length - 1];
            const res = await getMoreVidsAction(
                last ? { createdAt: last.createdAt, _id: last._id } : null,
            );
            setVideos((prev) => [...prev, ...res.videos]);
            setMore(res.nextCursor !== null);
        } catch {
            setError("Could not load more Vids.");
        } finally {
            loadingRef.current = false;
            setLoadingMore(false);
        }
    }, [more]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: "600px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);

    const onDeleted = useCallback((vidId: string) => {
        setVideos((prev) => prev.filter((v) => v._id !== vidId));
        if (activeId === vidId) {
            setActiveId(null);
        }
    }, [activeId]);

    const activeIndex = videos.findIndex((v) => v._id === activeId);

    // Jump to the previous / next slide. Each slide is exactly container-high,
    // so scrolling to its offset lands precisely on a snap point.
    const goTo = useCallback(
        (direction: "up" | "down") => {
            const container = containerRef.current;
            if (!container) return;
            const slides = Array.from(
                container.querySelectorAll<HTMLElement>("[data-vid-slide]"),
            );
            if (slides.length === 0) return;
            const current = slides.findIndex((s) => s.dataset.vidId === activeId);
            if (current < 0) return;
            const targetIndex = direction === "down" ? current + 1 : current - 1;
            const target = slides[targetIndex];
            if (!target) return;
            container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
        },
        [activeId],
    );

    if (videos.length === 0 && !loadingMore) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#dbe9f7] p-6 text-center">
                <p className="text-lg font-bold text-[#2c4d80]">No Vids yet</p>
                <p className="text-[13px] text-gray-600">
                    Be the first to share a short video with Genggi!
                </p>
                {isLoggedIn && (
                    <Link
                        href="/vids/upload"
                        className="btn inline-flex items-center gap-1.5 no-underline"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Upload your first Vid
                    </Link>
                )}
            </div>
        );
    }

    return (
        <>
            <div
                ref={containerRef}
                className="h-full overflow-y-auto overscroll-contain snap-y snap-mandatory scroll-smooth md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden"
            >
                {videos.map((vid, index) => {
                    const active = vid._id === activeId;
                    // Only the active and next slides download the video; the rest
                    // load metadata at most.
                    const preload =
                        index === activeIndex || index === activeIndex + 1
                            ? "auto"
                            : "metadata";
                    return (
                        <section
                            key={vid._id}
                            data-vid-slide
                            data-vid-id={vid._id}
                            className="relative h-full w-full snap-start snap-always overflow-hidden bg-black"
                            aria-label={`Vid by ${displayNameOrUsername(vid.author.displayName, vid.author.username)}`}
                        >
                            <div className="mx-auto flex h-full w-full max-w-[960px] items-center justify-center">
                                <div className="relative h-full w-full bg-black sm:h-auto sm:aspect-[9/16] sm:max-h-full sm:max-w-[min(540px,calc(100dvh*0.5625))]">
                                    <VidPlayer
                                        vid={vid}
                                        active={active}
                                        preload={preload}
                                    />
                                    <VidCard
                                        vid={vid}
                                        isLoggedIn={isLoggedIn}
                                        currentUserId={currentUserId}
                                        onDeleted={onDeleted}
                                    />
                                </div>
                            </div>
                        </section>
                    );
                })}
                <div
                    ref={sentinelRef}
                    className="flex h-12 items-center justify-center text-[12px] text-gray-400"
                >
                    {loadingMore && <span>Loading more Vids...</span>}
                    {error && <span className="text-red-600">{error}</span>}
                    {!more && videos.length > 0 && !loadingMore && (
                        <span>You&apos;re all caught up 🎉</span>
                    )}
                </div>
            </div>

            {/* Desktop up/down navigation instead of a scroll bar */}
            <div className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 md:flex">
                <button
                    type="button"
                    onClick={() => goTo("up")}
                    disabled={activeIndex <= 0}
                    aria-label="Previous Vid"
                    title="Previous Vid"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#6699cc] bg-white/90 text-[#2c4d80] shadow-md transition-colors hover:bg-[#dbe9f7] disabled:cursor-default disabled:opacity-40"
                >
                    <ChevronUp size={22} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => goTo("down")}
                    disabled={activeIndex < 0 || activeIndex >= videos.length - 1}
                    aria-label="Next Vid"
                    title="Next Vid"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#6699cc] bg-white/90 text-[#2c4d80] shadow-md transition-colors hover:bg-[#dbe9f7] disabled:cursor-default disabled:opacity-40"
                >
                    <ChevronDown size={22} aria-hidden="true" />
                </button>
            </div>
        </>
    );
}