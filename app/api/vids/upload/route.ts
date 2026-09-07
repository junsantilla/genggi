import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { putObject, publicUrlForKey, deleteObject } from "@/lib/r2";
import {
    VID_ALLOWED_MIME,
    VID_MAX_UPLOAD_BYTES,
    canStartUpload,
    ensureVidIndexes,
    vidVideoKey,
    cleanupAbandonedVids,
} from "@/lib/vids";
import { processVideo } from "@/lib/video-processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opportunistic cleanup: every 25th upload sweeps abandoned uploads so R2
// never accumulates orphaned objects between scheduled/admin runs.
let uploadCounter = 0;

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

        // Validate the upload before touching storage. The browser's MIME and
        // size checks are never trusted on their own.
        const contentType = (request.headers.get("content-type") || "").toLowerCase();
        if (!VID_ALLOWED_MIME.has(contentType)) {
            return NextResponse.json(
                { error: "Unsupported file type. Please upload an MP4, MOV, or WebM video." },
                { status: 415 },
            );
        }
        const contentLength = Number(request.headers.get("content-length") || "0");
        if (!Number.isFinite(contentLength) || contentLength <= 0) {
            return NextResponse.json(
                { error: "Missing file size." },
                { status: 400 },
            );
        }
        if (contentLength > VID_MAX_UPLOAD_BYTES) {
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
            fileSize: contentLength,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            status: "uploading",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        try {
            if (!request.body) throw new Error("No request body.");
            const stream = Readable.fromWeb(
                request.body as unknown as import("stream/web").ReadableStream,
            );
            await putObject(key, stream, contentType, contentLength);
        } catch (error) {
            // Aborted or failed upload: remove the (possibly partial) object
            // and mark the record failed so cleanup can reclaim it.
            console.error("Vid upload stream failed:", error);
            await deleteObject(key).catch(() => {});
            await db
                .collection("vids")
                .updateOne(
                    { _id: vidId },
                    { $set: { status: "failed", updatedAt: new Date() } },
                );
            return NextResponse.json(
                { error: "Upload failed. Please try again." },
                { status: 500 },
            );
        }

        // Server-side processing hook. Today this is a passthrough that keeps
        // the uploaded file at its final key; a future transcoder can write a
        // new key here while the record stays in "processing".
        const processed = await processVideo({
            userId,
            vidId: vidId.toString(),
            videoKey: key,
            contentType,
        });
        const finalKey = processed.videoKey;
        await db.collection("vids").updateOne(
            { _id: vidId },
            {
                $set: {
                    status: "processing",
                    videoKey: finalKey,
                    videoUrl:
                        finalKey === key ? videoUrl : publicUrlForKey(finalKey),
                    updatedAt: new Date(),
                },
            },
        );

        return NextResponse.json({ ok: true, vidId: vidId.toString() });
    } catch (error) {
        console.error("Vid upload failed:", error);
        return NextResponse.json(
            { error: "Upload failed. Please try again." },
            { status: 500 },
        );
    }
}