import { NextRequest, NextResponse } from "next/server";
import { uploadImage, destroyImage } from "@/lib/r2";

// Production-only R2 proxy for the local dev server. The local server uploads
// images and deletes them through this endpoint so contributors never need the
// R2_* secrets on their machine. Gated by GENGGI_API_TOKEN (server-to-server).
//
//   Local Next.js  ->  Genggi production API  ->  Cloudflare R2

function assertToken(req: NextRequest): boolean {
  const expected = process.env.GENGGI_API_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return !!token && token === expected;
}

export async function POST(req: NextRequest) {
  if (!assertToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const folder = req.headers.get("x-r2-folder");
  const contentType = req.headers.get("content-type") || "application/octet-stream";
  if (!folder) {
    return NextResponse.json({ error: "x-r2-folder header required" }, { status: 400 });
  }
  const buffer = Buffer.from(await req.arrayBuffer());
  try {
    const result = await uploadImage(buffer, folder, contentType);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!assertToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { identifier?: string };
  try {
    body = (await req.json()) as { identifier?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.identifier) {
    return NextResponse.json({ error: "identifier required" }, { status: 400 });
  }
  try {
    await destroyImage(body.identifier);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
