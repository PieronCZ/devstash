import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemFile } from "@/lib/db/items";
import { getFromR2, keyFromPublicUrl } from "@/lib/r2";

// GET /api/items/[id]/download
// Same-origin download proxy for a file-backed item, scoped to the signed-in
// owner. Streams the object from R2 with `Content-Disposition: attachment` and
// the original filename — avoids R2 bucket CORS and forces a real download rather
// than in-tab navigation.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const file = await getItemFile(userId, id);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const key = keyFromPublicUrl(file.fileUrl);
  if (!key) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const object = await getFromR2(key);
    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.contentType ?? "application/octet-stream",
    );
    if (object.contentLength != null) {
      headers.set("Content-Length", String(object.contentLength));
    }
    // Encode the filename per RFC 5987 so non-ASCII names survive the header.
    const fallback = file.fileName ?? "download";
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fallback)}`,
    );

    return new NextResponse(object.body, { status: 200, headers });
  } catch (error) {
    console.error("R2 download failed:", error);
    return NextResponse.json(
      { error: "Could not download file." },
      { status: 502 },
    );
  }
}
