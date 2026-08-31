import { NextRequest, NextResponse } from "next/server";
import { EJSON } from "bson";
import {
  createSessionToken,
  destroySessionCookie,
  getUserByCookie,
} from "@/lib/auth";

// Production-only auth proxy for the local dev server. Because session HMAC
// signing uses the production AUTH_SECRET, the dev server (which does not hold
// AUTH_SECRET) delegates session create/destroy/verify here. The dev server
// still owns the `session` cookie on localhost; it just asks this endpoint to
// mint, delete, or validate the underlying session.
//
//   Local Next.js  ->  Genggi production API  ->  Production sessions/users DB

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
  let body: { action?: string; userId?: string; cookie?: string };
  try {
    body = (await req.json()) as { action?: string; userId?: string; cookie?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.action === "create") {
      if (!body.userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
      }
      const cookie = await createSessionToken(body.userId);
      return NextResponse.json({ cookie });
    }

    if (body.action === "destroy") {
      if (!body.cookie) {
        return NextResponse.json({ error: "cookie required" }, { status: 400 });
      }
      await destroySessionCookie(body.cookie);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "verify") {
      if (!body.cookie) {
        return NextResponse.json({ error: "cookie required" }, { status: 400 });
      }
      const user = await getUserByCookie(body.cookie);
      if (!user) return NextResponse.json({ ok: true, user: null });
      // EJSON-encode the user so ObjectId/Date survive the HTTP boundary.
      return NextResponse.json({
        ok: true,
        user: EJSON.stringify(user),
      });
    }

    return NextResponse.json({ error: "Unknown auth action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
