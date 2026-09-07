import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { anonymousViewerKey, recordVidView } from "@/lib/vids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Counts a view only when the watch was meaningful (>= 2 seconds or >= 50% of
// the video) and the viewer hasn't already been counted for this vid. The
// client never writes counters; it only reports how long it watched, and the
// server validates, caps, and deduplicates.
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ vidId: string }> },
) {
    const { vidId } = await params;

    let payload: { watchedSeconds?: unknown; videoDuration?: unknown } = {};
    try {
        payload = (await request.json()) as typeof payload;
    } catch {
        return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 },
        );
    }

    const watchedSeconds = Number(payload.watchedSeconds);
    const videoDuration = Number(payload.videoDuration);
    if (
        !Number.isFinite(watchedSeconds) ||
        !Number.isFinite(videoDuration) ||
        watchedSeconds < 0 ||
        videoDuration <= 0
    ) {
        return NextResponse.json(
            { error: "Invalid watch data." },
            { status: 400 },
        );
    }

    const user = await getCurrentUser();
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
        forwarded?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
    const viewerKey = user
        ? user._id.toString()
        : anonymousViewerKey(ip);

    const result = await recordVidView(
        vidId,
        viewerKey,
        watchedSeconds,
        videoDuration,
    );
    if (!result.ok) {
        return NextResponse.json(
            { ok: false, error: result.error ?? "Vid not found." },
            { status: result.error === "Invalid vid id." ? 400 : 404 },
        );
    }
    return NextResponse.json({ ok: true, counted: result.counted });
}