import { NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail";

// Production-only email proxy for the local dev server. The local server sends
// verification and password-reset emails through this endpoint so contributors
// never need RESEND_API_KEY on their machine. Gated by GENGGI_API_TOKEN.
//
//   Local Next.js  ->  Genggi production API  ->  Resend / production SMTP

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
  let body: { kind?: string; to?: string; url?: string };
  try {
    body = (await req.json()) as { kind?: string; to?: string; url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { kind, to, url } = body;
  if (!to || !url) {
    return NextResponse.json({ error: "to and url required" }, { status: 400 });
  }
  try {
    if (kind === "verify") {
      await sendVerificationEmail(to, url);
    } else if (kind === "reset") {
      await sendPasswordResetEmail(to, url);
    } else {
      return NextResponse.json({ error: "Unknown mail kind" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
