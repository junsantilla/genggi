import { randomUUID } from "node:crypto";
import {
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.R2_BUCKET;
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

let client: S3Client | undefined;

function getR2() {
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicUrl) {
    throw new Error(
      "R2 is not configured. Set R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL.",
    );
  }
  client ??= new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, bucket, publicUrl };
}

export interface R2UploadResult {
  secure_url: string;
  public_id: string;
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/^\/+|\/+$/g, "");
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  contentType = "application/octet-stream",
): Promise<R2UploadResult> {
  const r2 = getR2();
  const key = `${safeSegment(folder)}/${randomUUID()}`;
  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { secure_url: `${r2.publicUrl}/${key}`, public_id: key };
}

export async function destroyImage(identifier: string): Promise<void> {
  if (!identifier || identifier.startsWith("cloudinary:")) return;
  if (identifier.startsWith("http://") || identifier.startsWith("https://")) return;
  const r2 = getR2();
  await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: identifier }));
}

// ------------------------------------------------------------------- Vids

// Uploads bytes or a Node stream to an exact, caller-controlled key. Used by
// Vids, where the storage path is a predictable server-generated structure
// (vids/{userId}/{vidId}/...) rather than the random key uploadImage makes.
export async function putObject(
  key: string,
  body: Buffer | import("stream").Readable,
  contentType: string,
  contentLength?: number,
): Promise<void> {
  const r2 = getR2();
  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

// Deletes a single object by its storage key. Returns false when the key looks
// like a URL or a Cloudinary public id so callers know nothing was removed.
export async function deleteObject(key: string | null | undefined): Promise<boolean> {
  if (!key) return false;
  if (key.startsWith("cloudinary:")) return false;
  if (key.startsWith("http://") || key.startsWith("https://")) return false;
  const r2 = getR2();
  await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
  return true;
}

// Builds the public URL for an object key stored in the R2 bucket.
export function publicUrlForKey(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) throw new Error("R2_PUBLIC_URL is not set in .env.local");
  return `${base}/${key}`;
}

// Creates a short-lived presigned PUT URL so the browser can upload directly
// to R2 without the bytes passing through a Vercel Function (Vercel caps
// function request bodies at ~4.5 MB, so a 100 MB proxied upload can never
// work there). The server still creates the vid record first and verifies
// the object with headObject() in the complete step.
export async function createPresignedPutUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 600,
): Promise<string> {
    const r2 = getR2();
    // NOTE: only ContentType is signed here. The browser must send exactly
    // this Content-Type and nothing extra (e.g. no Cache-Control), otherwise
    // R2 rejects the PUT with a signature mismatch.
    return getSignedUrl(
        r2.client,
        new PutObjectCommand({
            Bucket: r2.bucket,
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn: expiresInSeconds },
    );
}

// HEADs an object to verify a direct-to-R2 upload actually landed and to
// learn its real size/MIME. The complete route never trusts client claims.
export async function headObject(
    key: string,
): Promise<{ size: number; contentType: string | undefined }> {
    const r2 = getR2();
    const out = await r2.client.send(
        new HeadObjectCommand({ Bucket: r2.bucket, Key: key }),
    );
    return {
        size: Number(out.ContentLength ?? 0),
        contentType: out.ContentType,
    };
}
