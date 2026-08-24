import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
    const res = await fetch(oembedUrl, { next: { revalidate: 86400 } });

    if (!res.ok) {
      return NextResponse.json({ title: null }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({ title: data.title ?? null });
  } catch {
    return NextResponse.json({ title: null }, { status: 200 });
  }
}
