import { describe, expect, it } from "vitest";

import {
  acceptAttribute,
  extensionOf,
  UPLOAD_RULES,
  validateUpload,
} from "@/lib/upload";

const MB = 1024 * 1024;

describe("extensionOf", () => {
  it("returns the lowercased extension including the dot", () => {
    expect(extensionOf("photo.PNG")).toBe(".png");
    expect(extensionOf("archive.tar.gz")).toBe(".gz");
    expect(extensionOf("Notes.MD")).toBe(".md");
  });

  it("returns empty string when there is no usable extension", () => {
    expect(extensionOf("README")).toBe("");
    expect(extensionOf(".gitignore")).toBe(""); // leading dot only, no name
    expect(extensionOf("trailingdot.")).toBe("");
  });
});

describe("acceptAttribute", () => {
  it("lists the kind's extensions and MIME types", () => {
    const accept = acceptAttribute("image");
    expect(accept).toContain(".png");
    expect(accept).toContain("image/png");
    expect(accept).not.toContain(".pdf");
  });
});

describe("validateUpload — images", () => {
  it("accepts a valid png under the limit", () => {
    const res = validateUpload({
      kind: "image",
      fileName: "shot.png",
      size: 2 * MB,
      mimeType: "image/png",
    });
    expect(res).toEqual({ ok: true, kind: "image", extension: ".png" });
  });

  it("rejects an image over the 5 MB limit", () => {
    const res = validateUpload({
      kind: "image",
      fileName: "big.jpg",
      size: 5 * MB + 1,
      mimeType: "image/jpeg",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/too large/i);
  });

  it("rejects a disallowed extension even with an image-ish name", () => {
    const res = validateUpload({
      kind: "image",
      fileName: "notes.txt",
      size: 100,
      mimeType: "text/plain",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/unsupported file type/i);
  });

  it("rejects an empty file", () => {
    const res = validateUpload({
      kind: "image",
      fileName: "empty.png",
      size: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/empty/i);
  });
});

describe("validateUpload — files", () => {
  it("accepts a valid pdf just under the 10 MB limit", () => {
    const res = validateUpload({
      kind: "file",
      fileName: "doc.pdf",
      size: 10 * MB,
      mimeType: "application/pdf",
    });
    expect(res).toEqual({ ok: true, kind: "file", extension: ".pdf" });
  });

  it("accepts allowed text-ish types (yaml, toml, ini, csv)", () => {
    for (const name of ["config.yaml", "Cargo.toml", "php.ini", "data.csv"]) {
      const res = validateUpload({ kind: "file", fileName: name, size: 100 });
      expect(res.ok).toBe(true);
    }
  });

  it("rejects a file over the 10 MB limit", () => {
    const res = validateUpload({
      kind: "file",
      fileName: "huge.pdf",
      size: 10 * MB + 1,
      mimeType: "application/pdf",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a disallowed file extension (e.g. .exe)", () => {
    const res = validateUpload({ kind: "file", fileName: "run.exe", size: 100 });
    expect(res.ok).toBe(false);
  });
});

describe("validateUpload — MIME handling", () => {
  it("passes when no MIME type is provided but the extension is allowed", () => {
    const res = validateUpload({
      kind: "image",
      fileName: "shot.webp",
      size: 100,
    });
    expect(res.ok).toBe(true);
  });

  it("rejects a mismatched MIME type even with an allowed extension", () => {
    const res = validateUpload({
      kind: "image",
      fileName: "shot.png",
      size: 100,
      mimeType: "application/x-msdownload",
    });
    expect(res.ok).toBe(false);
  });
});

describe("UPLOAD_RULES", () => {
  it("uses 5 MB for images and 10 MB for files", () => {
    expect(UPLOAD_RULES.image.maxSize).toBe(5 * MB);
    expect(UPLOAD_RULES.file.maxSize).toBe(10 * MB);
  });
});
