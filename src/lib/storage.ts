import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "./env";

/**
 * File storage for the document vault.
 *  - S3-compatible (AWS S3, Cloudflare R2, Supabase Storage, MinIO) when S3_* env is set.
 *  - Local disk under data/uploads otherwise. Files are only ever served through
 *    /api/files/[id], which checks the caller belongs to the document's org.
 */

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]);

export function validateUpload(file: { size: number; type: string; name: string }) {
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_BYTES) return "File is larger than 15 MB.";
  if (!ALLOWED.has(file.type)) return "Only PDF and image files are accepted.";
  return null;
}

function keyFor(orgId: number, fileName: string) {
  const ext = path.extname(fileName).toLowerCase().slice(0, 8) || "";
  return `org-${orgId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;
}

async function s3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: env.storage.region,
    endpoint: env.storage.endpoint || undefined,
    forcePathStyle: Boolean(env.storage.endpoint),
    credentials: { accessKeyId: env.storage.accessKeyId, secretAccessKey: env.storage.secretAccessKey },
  });
}

export async function putFile(orgId: number, file: File): Promise<{ key: string; size: number; contentType: string }> {
  const key = keyFor(orgId, file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (env.storage.configured) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3();
    await client.send(new PutObjectCommand({ Bucket: env.storage.bucket, Key: key, Body: bytes, ContentType: file.type }));
  } else {
    const full = path.join(process.cwd(), "data", "uploads", key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
  }
  return { key, size: bytes.length, contentType: file.type };
}

/** Either a short-lived signed URL (S3) or the bytes themselves (local). */
export async function getFile(key: string): Promise<{ redirectUrl: string } | { body: Buffer }> {
  if (env.storage.configured) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await s3();
    const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: env.storage.bucket, Key: key }), { expiresIn: 300 });
    return { redirectUrl: url };
  }
  const full = path.join(process.cwd(), "data", "uploads", key);
  return { body: await fs.readFile(full) };
}

export async function deleteFile(key: string | null | undefined) {
  if (!key) return;
  try {
    if (env.storage.configured) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await s3();
      await client.send(new DeleteObjectCommand({ Bucket: env.storage.bucket, Key: key }));
    } else {
      await fs.unlink(path.join(process.cwd(), "data", "uploads", key));
    }
  } catch {
    // best-effort
  }
}
