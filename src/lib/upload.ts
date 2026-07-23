// Upload constraints for the two file-backed system types (file & image) and the
// pure validation around them. Kept free of any server-only imports so it can be
// shared by the client FileUpload component (pre-flight checks) and the upload
// API route (authoritative check) and unit-tested in isolation.

export type UploadKind = "file" | "image";

export interface UploadRules {
  maxSize: number; // bytes
  extensions: readonly string[]; // lowercase, with leading dot
  mimeTypes: readonly string[];
}

const MB = 1024 * 1024;

// Per-kind size limits, allowed extensions, and MIME types (see the feature
// spec). Extensions are the source of truth for the accepted set; MIME types are
// checked too but browsers/OSes are inconsistent about them, so extension wins.
export const UPLOAD_RULES: Record<UploadKind, UploadRules> = {
  image: {
    maxSize: 5 * MB,
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
  },
  file: {
    maxSize: 10 * MB,
    extensions: [
      ".pdf",
      ".txt",
      ".md",
      ".json",
      ".yaml",
      ".yml",
      ".xml",
      ".csv",
      ".toml",
      ".ini",
    ],
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
      "application/x-yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/csv",
      "application/toml",
    ],
  },
};

// The `accept` attribute value for a file input of the given kind — the allowed
// extensions and MIME types, so the OS picker filters up-front.
export function acceptAttribute(kind: UploadKind): string {
  const { extensions, mimeTypes } = UPLOAD_RULES[kind];
  return [...extensions, ...mimeTypes].join(",");
}

// Lowercased file extension including the leading dot, or "" when there is none.
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot).toLowerCase();
}

function humanSize(bytes: number): string {
  if (bytes % MB === 0) return `${bytes / MB} MB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

export type UploadValidation =
  | { ok: true; kind: UploadKind; extension: string }
  | { ok: false; error: string };

// Validate a candidate upload against its kind's rules. MIME type is optional
// (some sources omit it); when present it must be in the allowlist, but a valid
// extension is always required. Used identically on client and server.
export function validateUpload(input: {
  kind: UploadKind;
  fileName: string;
  size: number;
  mimeType?: string;
}): UploadValidation {
  const rules = UPLOAD_RULES[input.kind];
  if (!rules) return { ok: false, error: "Unsupported upload type." };

  if (input.size <= 0) {
    return { ok: false, error: "File is empty." };
  }
  if (input.size > rules.maxSize) {
    return {
      ok: false,
      error: `File is too large. Max ${humanSize(rules.maxSize)} for ${
        input.kind === "image" ? "images" : "files"
      }.`,
    };
  }

  const extension = extensionOf(input.fileName);
  if (!extension || !rules.extensions.includes(extension)) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${rules.extensions.join(", ")}.`,
    };
  }

  // Only reject on MIME when one is provided and it's clearly outside the set —
  // extension is the primary gate.
  if (input.mimeType && !rules.mimeTypes.includes(input.mimeType)) {
    return {
      ok: false,
      error: `Unsupported file type "${input.mimeType}".`,
    };
  }

  return { ok: true, kind: input.kind, extension };
}
