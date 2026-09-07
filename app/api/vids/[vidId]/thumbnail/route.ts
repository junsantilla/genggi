import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { putObject, publicUrlForKey } from "@/lib/r2";
import {
    VID_MAX_THUMBNAIL_BYTES,
    vidThumbnailKey,
} from "@/lib/vids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stores the thumbnail for an uploaded Vid. The frame is generated on the
// client (canvas capture of the preview) and uploaded as a small JPEG, so no
// server-side video decoding is required. Only the vid owner may set it.
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ vidId: string }> },
) {
    const { vidId } = await params;
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json(
            { error: "You must be logged in." },
            { status: 401 },
        );
    }

    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    if (contentType !== "image/jpeg") {
        return NextResponse.json(
            { error: "Thumbnail must be a JPEG image." },
            { status: 415 },
        );
    }
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
        return NextResponse.json(
            { error: "Missing thumbnail data." },
            { status: 400 },
        );
    }
    if (contentLength > VID_MAX_THUMBNAIL_BYTES) {
        return NextResponse.json(
            { error: "Thumbnail must be under 2 MB." },
            { status: 413 },
        );
    }

    const db = getDb();
    let oid: ObjectId;
    try {
        oid = new ObjectId(vidId);
    } catch {
        return NextResponse.json({ error: "Vid not found." }, { status: 404 });
    }
    const vid = await db.collection("vids").findOne({ _id: oid });
    if (!vid) {
        return NextResponse.json({ error: "Vid not found." }, { status: 404 });
    }
    if (vid.userId.toString() !== user._id.toString()) {
        return NextResponse.json(
            { error: "You can only add a thumbnail to your own Vids." },
            { status: 403 },
        );
    }

    const bytes = Buffer.from(await request.arrayBuffer());
    const key = vidThumbnailKey(user._id.toString(), vidId);
    await putObject(key, bytes, "image/jpeg", bytes.length);
    const thumbnailUrl = publicUrlForKey(key);

    await db
        .collection("vids")
        .updateOne(
            { _id: oid },
            { $set: { thumbnailKey: key, thumbnailUrl, updatedAt: new Date() } },
        );

    return NextResponse.json({ ok: true, thumbnailUrl });
}