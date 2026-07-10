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
