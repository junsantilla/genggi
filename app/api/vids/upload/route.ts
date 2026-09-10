import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { createPresignedPutUrl, publicUrlForKey } from "@/lib/r2";
import {
    VID_ALLOWED_MIME,
    VID_MAX_UPLOAD_BYTES,
    canStartUpload,
    ensureVidIndexes,
    vidVideoKey,
    cleanupAbandonedVids,
} from "@/lib/vids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// This route only mints a short-lived presigned URL (tiny JSON in/out), so it
// stays far under Vercel's ~4.5 MB function body limit. The 100 MB of video
// bytes go directly from the browser to R2 and never touch Vercel.
export const maxDuration = 60;

// Opportunistic cleanup: every 25th request sweeps abandoned uploads so R2
// never accumulates orphaned objects between scheduled/admin runs.
let uploadCounter = 0;

// Step 1 of the Vercel-safe upload flow:
//   1. POST here with JSON { contentType, fileSize } -> { vidId, uploadUrl }
//   2. Browser PUTs the file bytes directly to uploadUrl (R2, not Vercel)
//   3. Browser POSTs /api/vids/[vidId]/complete to verify + mark processing
//   4. Browser uploads thumbnail + publishes via finishVidAction (unchanged)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: "You must be logged in to upload a Vid." },
                { status: 401 },
            );
        }
        if (user.banned) {
            return NextResponse.json(
                { error: "This account has been suspended." },
                { status: 403 },
            );
        }

        let body: { contentType?: unknown; fileSize?: unknown };
        try {
            body = (await request.json()) as typeof body;
        } catch {
            return NextResponse.json(
                { error: "Expected JSON { contentType, fileSize }." },
                { status: 400 },
            );
        }

        // Validate before touching storage or minting a URL. The browser's
        // MIME and size checks are never trusted on their own, and the object
        // is re-verified with an R2 HEAD in the complete step.
        const contentType = String(body.contentType ?? "").toLowerCase();
        if (!VID_ALLOWED_MIME.has(contentType)) {
            return NextResponse.json(
                { error: "Unsupported file type. Please upload an MP4, MOV, or WebM video." },
                { status: 415 },
            );
        }
        const fileSize = Number(body.fileSize);
        if (!Number.isFinite(fileSize) || fileSize <= 0) {
            return NextResponse.json(
                { error: "Missing file size." },
                { status: 400 },
            );
        }
        if (fileSize > VID_MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 100 MB." },
                { status: 413 },
            );
        }

        const limit = await canStartUpload(user._id.toString());
        if (!limit.allowed) {
            return NextResponse.json({ error: limit.error }, { status: 429 });
        }

        if (++uploadCounter % 25 === 0) {
            cleanupAbandonedVids().catch(() => {});
        }

        await ensureVidIndexes();
        const db = getDb();
        const vidId = new ObjectId();
        const userId = user._id.toString();
        // Deterministic, server-generated key. The user's filename never
        // becomes part of the storage path.
        const key = vidVideoKey(userId, vidId.toString());
        const videoUrl = publicUrlForKey(key);

        await db.collection("vids").insertOne({
            _id: vidId,
            userId: user._id,
            videoKey: key,
            videoUrl,
            thumbnailKey: null,
            thumbnailUrl: null,
            caption: "",
            hashtags: [],
            duration: 0,
            width: 0,
            height: 0,
            fileSize,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            status: "uploading",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        let uploadUrl: string;
        try {
            uploadUrl = await createPresignedPutUrl(key, contentType);
        } catch (error) {
            console.error("Vid presigned URL failed:", error);
            await db.collection("vids").deleteOne({ _id: vidId }).catch(() => {});
            return NextResponse.json(
                { error: "Upload failed. Please try again." },
                { status: 500 },
            );
        }

        return NextResponse.json({ ok: true, vidId: vidId.toString(), uploadUrl });
    } catch (error) {
        console.error("Vid upload request failed:", error);
        return NextResponse.json(
            { error: "Upload failed. Please try again." },
            { status: 500 },
        );
    }
}
