// Cloudflare R2 storage boundary. R2 is S3-compatible, so we drive it with the
// AWS S3 client pointed at the R2 endpoint. All object access for uploads/files
// funnels through here so the rest of the app never touches the S3 SDK directly.
//
// Objects are stored under `uploads/<userId>/<id>.<ext>` and referenced by their
// public URL (`R2_PUBLIC_URL/<key>`) in `Item.fileUrl`. Image previews read that
// URL directly; downloads and deletes recover the object key from it.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Read config lazily so importing this module (e.g. in tests) never throws when
// R2 isn't configured — only the functions that actually talk to R2 require it.
function readConfig() {
  const endpoint = process.env.S3_API_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "R2 is not configured — set S3_API_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL.",
    );
  }

  // Normalize the public base to have no trailing slash so key joins are clean.
  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };
}

// Memoized client — one per server process.
let client: S3Client | null = null;
function getClient(endpoint: string, accessKeyId: string, secretAccessKey: string) {
  if (!client) {
    client = new S3Client({
      // R2 ignores region but the SDK requires one; "auto" is the R2 convention.
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

// The public URL an object key is served from.
export function publicUrlForKey(key: string): string {
  const { publicUrl } = readConfig();
  return `${publicUrl}/${key}`;
}

// Recover the object key from a stored public URL. Returns null when the URL
// doesn't sit under the configured public base (defensive — shouldn't happen for
// our own uploads).
export function keyFromPublicUrl(fileUrl: string): string | null {
  const { publicUrl } = readConfig();
  const prefix = `${publicUrl}/`;
  if (!fileUrl.startsWith(prefix)) return null;
  return fileUrl.slice(prefix.length);
}

// Upload a file body to R2 under `key`. Returns the object's public URL.
export async function uploadToR2(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  const cfg = readConfig();
  await getClient(cfg.endpoint, cfg.accessKeyId, cfg.secretAccessKey).send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrlForKey(key);
}

// Delete an object from R2 by key. Idempotent — deleting a missing key is a no-op
// on R2's side.
export async function deleteFromR2(key: string): Promise<void> {
  const cfg = readConfig();
  await getClient(cfg.endpoint, cfg.accessKeyId, cfg.secretAccessKey).send(
    new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
  );
}

// What the download proxy needs to stream an object back to the client.
export interface R2Object {
  body: ReadableStream;
  contentType: string | undefined;
  contentLength: number | undefined;
}

// Fetch an object from R2 for the download proxy. Throws when the key is missing.
export async function getFromR2(key: string): Promise<R2Object> {
  const cfg = readConfig();
  const res = await getClient(
    cfg.endpoint,
    cfg.accessKeyId,
    cfg.secretAccessKey,
  ).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));

  if (!res.Body) throw new Error(`R2 object not found: ${key}`);

  return {
    // In the Node/Next runtime the S3 SDK returns a web ReadableStream here.
    body: res.Body.transformToWebStream(),
    contentType: res.ContentType,
    contentLength: res.ContentLength,
  };
}
