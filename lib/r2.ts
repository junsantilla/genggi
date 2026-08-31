import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DEV_PROXY, genggiR2Destroy, genggiR2Upload } from "@/lib/genggi";

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
  // In local dev without R2 secrets, route uploads through the production
  // Genggi API so contributors never need R2_* credentials locally.
  if (DEV_PROXY) return genggiR2Upload(buffer, folder, contentType);

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
  // Route deletes through the production Genggi API in dev-proxy mode.
  if (DEV_PROXY) return genggiR2Destroy(identifier);
  const r2 = getR2();
  await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: identifier }));
}
