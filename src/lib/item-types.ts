// Single source of truth for system item-type metadata shared across layers
// (data fetching + UI). Keeps the canonical ordering and Pro gating in one place
// so adding or renaming a system type only touches this file.

// Stable display order for the built-in system types. Anything not listed here
// is treated as unknown and appended after these (in name order) by callers.
export const SYSTEM_TYPE_ORDER: readonly string[] = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
  "file",
  "image",
];

// System item types gated behind a Pro plan — flagged with a PRO badge in the UI.
export const PRO_TYPES: ReadonlySet<string> = new Set(["file", "image"]);

// System types a user can create through the New Item dialog. file/image are
// file-backed (they use the upload flow instead of a text/url body). Order
// matches the dialog's type selector.
export const CREATABLE_SYSTEM_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
  "file",
  "image",
] as const;

export type CreatableSystemType = (typeof CREATABLE_SYSTEM_TYPES)[number];

// The creatable types backed by an uploaded object (ContentType.FILE) rather
// than a text/url body. Their New Item form shows the FileUpload field.
export const UPLOAD_SYSTEM_TYPES = ["file", "image"] as const;

export type UploadSystemType = (typeof UPLOAD_SYSTEM_TYPES)[number];

// Whether a creatable type is file-backed (needs an upload) vs. text/url.
export function isUploadType(type: string): type is UploadSystemType {
  return (UPLOAD_SYSTEM_TYPES as readonly string[]).includes(type);
}

// Resolve a route param — singular or plural, any case (e.g. "snippet",
// "snippets", "Links") — to a creatable system type, or null when it isn't one
// (the dashboard, or the Pro-only file/image types). Used to seed the New Item
// dialog's type from the current /items/[type] page. Pure/client-safe.
export function resolveCreatableType(
  param: string | null | undefined,
): CreatableSystemType | null {
  if (!param) return null;
  const name = param.toLowerCase();
  const creatable = CREATABLE_SYSTEM_TYPES as readonly string[];
  if (creatable.includes(name)) return name as CreatableSystemType;
  if (name.endsWith("s") && creatable.includes(name.slice(0, -1))) {
    return name.slice(0, -1) as CreatableSystemType;
  }
  return null;
}
