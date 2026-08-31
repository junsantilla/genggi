/**
 * Genggi API client.
 *
 * In local development this app talks to the production Genggi API
 * (https://genggi.com by default) for every operation that touches the
 * production database, Cloudflare R2, Resend email, or session auth. That way
 * contributors never need production DB/R2/email secrets on their machine:
 *
 *   Local Next.js  ->  Genggi production API  ->  Production DB / R2
 *
 * The same code runs unchanged in production, where each module (lib/db.ts,
 * lib/r2.ts, lib/mail.ts, lib/auth.ts) connects directly because the
 * production secrets are present.
 *
 * The link between the local dev server and the production API is a single
 * shared bearer token, `GENGGI_API_TOKEN`. Set it once on the production
 * deployment and pass the same value to each contributor for their
 * `.env.local`. It is the only secret local development needs, and it grants
 * privileged access — keep it out of the browser and never prefix it with
 * NEXT_PUBLIC_.
 */

import { EJSON } from "bson";

/**
 * True when running in the Next.js dev server without production data
 * secrets configured. The data-layer modules branch on this to decide whether
 * to connect directly or to delegate to the Genggi API.
 */
export const DEV_PROXY =
  process.env.NODE_ENV !== "production" &&
  !process.env.MONGODB_URI &&
  !!process.env.GENGGI_API_TOKEN;

/** Base URL of the production Genggi API used in dev-proxy mode. */
export const GENGGI_API_URL = (
  process.env.GENGGI_API_URL || "https://genggi.com"
).replace(/\/$/, "");

/** Shared bearer token authenticating the local dev server to the API. */
const TOKEN = process.env.GENGGI_API_TOKEN;

const TOKEN_ERROR =
  "GENGGI_API_TOKEN is not set. In local development without production " +
  "secrets, set GENGGI_API_TOKEN (and optionally GENGGI_API_URL) in " +
  ".env.local. See README.md.";

async function request<T>(
  path: string,
  init: RequestInit & { token?: string },
): Promise<T> {
  if (DEV_PROXY && !TOKEN) throw new Error(TOKEN_ERROR);
  const headers = new Headers(init.headers);
  if (TOKEN) headers.set("authorization", `Bearer ${TOKEN}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${GENGGI_API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (res.status === 401) {
    throw new Error(
      "Genggi API rejected the request: invalid or missing GENGGI_API_TOKEN.",
    );
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
      `Genggi API ${path} failed: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface GenggiDbResponse<T = unknown> {
  ok: true;
  result: T;
}

/**
 * Sends a single collection operation to the production DB via the Genggi API.
 * `op` is one of the Db/Collection methods the remote proxy supports
 * (see app/api/internal/db/route.ts). Documents and filters are EJSON-encoded
 * so ObjectId/Date/$-operators round-trip.
 */
export async function genggiDb<T = unknown>(
  op: Record<string, unknown>,
): Promise<T> {
  // EJSON-encode the whole payload so ObjectId/Date and $-operators in
  // filters, docs, and pipelines survive the HTTP trip. The server EJSON-
  // encodes the result the same way; decode it back to BSON types here.
  const body = EJSON.stringify(op);
  const res = await request<GenggiDbResponse<string>>("/api/internal/db", {
    method: "POST",
    body,
  });
  return EJSON.parse(res.result, { relaxed: false }) as T;
}

/** Uploads an image to production R2 via the Genggi API. */
export async function genggiR2Upload(
  buffer: Buffer,
  folder: string,
  contentType: string,
): Promise<{ secure_url: string; public_id: string }> {
  return request("/api/internal/r2", {
    method: "POST",
    headers: { "content-type": contentType, "x-r2-folder": folder },
    body: new Uint8Array(buffer),
  });
}

/** Deletes an object from production R2 via the Genggi API. */
export async function genggiR2Destroy(identifier: string): Promise<void> {
  await request("/api/internal/r2", {
    method: "DELETE",
    body: JSON.stringify({ identifier }),
  });
}

/** Sends a transactional email via the production Resend account. */
export async function genggiMail(
  kind: "verify" | "reset",
  to: string,
  url: string,
): Promise<void> {
  await request("/api/internal/mail", {
    method: "POST",
    body: JSON.stringify({ kind, to, url }),
  });
}

export interface GenggiAuthSession {
  /** Session cookie value to set on the local dev server's domain. */
  cookie: string;
}

/** Creates a production session and returns the cookie value for localhost. */
export async function genggiAuthCreate(userId: string): Promise<GenggiAuthSession> {
  return request("/api/internal/auth", {
    method: "POST",
    body: JSON.stringify({ userId, action: "create" }),
  });
}

/** Destroys a production session by its cookie value. */
export async function genggiAuthDestroy(cookie: string): Promise<void> {
  await request("/api/internal/auth", {
    method: "POST",
    body: JSON.stringify({ cookie, action: "destroy" }),
  });
}

/**
 * Validates a cookie value against the production session store and returns
 * the user document (with ObjectId/Date reconstructed via EJSON) or null.
 */
export async function genggiAuthVerify(cookie: string): Promise<unknown> {
  const res = await request<{ ok: boolean; user: string | null }>(
    "/api/internal/auth",
    {
      method: "POST",
      body: JSON.stringify({ cookie, action: "verify" }),
    },
  );
  if (!res.user) return null;
  return EJSON.parse(res.user, { relaxed: false });
}
