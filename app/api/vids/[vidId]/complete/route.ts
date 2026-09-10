import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { deleteObject, headObject, publicUrlForKey } from "@/lib/r2";
import {
    VID_ALLOWED_MIME,
    VID_MAX_UPLOAD_BYTES,
    vidVideoKey,
} from "@/lib/vids";
import { processVideo } from "@/lib/video-processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Tiny JSON verification step — no video bytes pass through Vercel here.
export const maxDuration = 60;

// Step 3 of the Vercel-safe upload flow. After the browser PUTs the file
// directly to R2, it calls here so the server can HEAD the object, enforce
// size/MIME/ownership, and move the record from "uploading" to "processing".
// Without this step a vid can never be published (finishVidAction only
// accepts uploading/processing records created by the owner).
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ vidId: string }> },
) {
    const { vidId } = await params;
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json(
            { error: "You must be logged in to upload a Vid." },
            { status: 401 },
        );
    }

    let oid: ObjectId;
    try {
        oid = new ObjectId(vidId);
    } catch {
        return NextResponse.json({ error: "Vid not found." }, { status: 404 });
    }

    const db = getDb();
    const vid = await db.collection("vids").findOne({ _id: oid });
    if (!vid) {
        return NextResponse.json({ error: "Vid not found." }, { status: 404 });
    }
    if (vid.userId.toString() !== user._id.toString()) {
        return NextResponse.json(
            { error: "You can only upload to your own Vids." },
            { status: 403 },
        );
    }
    if (vid.status !== "uploading") {
        return NextResponse.json(
            { error: "This upload was already completed." },
            { status: 409 },
        );
    }

    const userId = user._id.toString();
    const expectedKey = vidVideoKey(userId, vidId);
    if (vid.videoKey !== expectedKey) {
        return NextResponse.json({ error: "Vid not found." }, { status: 404 });
    }

    // Verify the direct-to-R2 upload actually landed. Never trust the file
    // size the client claimed when requesting the presigned URL.
    let actualSize: number;
    let actualType: string | undefined;
    try {
        const head = await headObject(expectedKey);
        actualSize = head.size;
        actualType = head.contentType?.toLowerCase();
    } catch (error) {
        console.error("Vid complete HEAD failed:", error);
        return NextResponse.json(
            { error: "Upload not found. Please upload the video first, then retry." },
            { status: 400 },
        );
    }

    if (!Number.isFinite(actualSize) || actualSize <= 0) {
        await deleteObject(expectedKey).catch(() => {});
        await db
            .collection("vids")
            .updateOne(
                { _id: oid },
                { $set: { status: "failed", updatedAt: new Date() } },
            );
        return NextResponse.json(
            { error: "Upload is empty. Please try again." },
            { status: 400 },
        );
    }
    if (actualSize > VID_MAX_UPLOAD_BYTES) {
        await deleteObject(expectedKey).catch(() => {});
        await db
            .collection("vids")
            .updateOne(
                { _id: oid },
                { $set: { status: "failed", updatedAt: new Date() } },
            );
        return NextResponse.json(
            { error: "File too large. Maximum size is 100 MB." },
            { status: 413 },
        );
    }
    if (actualType && !VID_ALLOWED_MIME.has(actualType)) {
        await deleteObject(expectedKey).catch(() => {});
        await db
            .collection("vids")
            .updateOne(
                { _id: oid },
                { $set: { status: "failed", updatedAt: new Date() } },
            );
        return NextResponse.json(
            { error: "Unsupported file type. Please upload an MP4, MOV, or WebM video." },
            { status: 415 },
        );
    }

    // Server-side processing hook. Today this is a passthrough that keeps the
    // uploaded file at its final key; a future transcoder can write a new key
    // here while the record stays in "processing".
    const processed = await processVideo({
        userId,
        vidId: vidId.toString(),
        videoKey: expectedKey,
        contentType: actualType ?? "video/mp4",
    });
    const finalKey = processed.videoKey;
    await db.collection("vids").updateOne(
        { _id: oid },
        {
            $set: {
                status: "processing",
                fileSize: actualSize,
                videoKey: finalKey,
                videoUrl:
                    finalKey === expectedKey ? vid.videoUrl : publicUrlForKey(finalKey),
                updatedAt: new Date(),
            },
        },
    );

    return NextResponse.json({ ok: true, vidId: vidId.toString() });
}
