import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { uploadToR2 } from "@/lib/r2";
import {
  extensionOf,
  validateUpload,
  type UploadKind,
} from "@/lib/upload";

// POST /api/upload
// Streams a file/image upload through the server to Cloudflare R2 (no presigned
// URL / bucket CORS needed — the download proxy mirrors this). Accepts multipart
// form data with `file` (the binary) and `kind` ("file" | "image"), enforces the
// per-kind size/extension/MIME rules, then stores it under
// `uploads/<userId>/<uuid>.<ext>`. Returns the file's public URL and metadata for
// the create-item form to persist.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 },
    );
  }

  const kind = form.get("kind");
  const file = form.get("file");

  if (kind !== "file" && kind !== "image") {
    return NextResponse.json(
      { error: "Missing or invalid upload kind." },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const validation = validateUpload({
    kind: kind as UploadKind,
    fileName: file.name,
    size: file.size,
    mimeType: file.type || undefined,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const extension = extensionOf(file.name);
  const key = `uploads/${userId}/${randomUUID()}${extension}`;
  const contentType = file.type || "application/octet-stream";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadToR2(key, buffer, contentType);

    return NextResponse.json({
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("R2 upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
