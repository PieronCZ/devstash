import { z } from "zod";

// Coerce empty/whitespace-only strings to null so an optional field cleared in
// the edit form persists as null rather than an empty string.
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

// Payload for editing an item from the drawer. All fields the UI can change are
// covered here; the item's type, collections, and timestamps are not editable.
// Type-specific fields (content/url/language) are optional — the client only
// sends the ones relevant to the item's type, and the query layer only writes
// fields that are present.
export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.preprocess(emptyToNull, z.string().trim().nullable()).optional(),
  content: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  url: z
    .preprocess(emptyToNull, z.string().trim().url("Must be a valid URL").nullable())
    .optional(),
  language: z.preprocess(emptyToNull, z.string().trim().nullable()).optional(),
  // Trim, drop empties, and de-duplicate so the tag set is always clean.
  tags: z
    .array(z.string())
    .transform((arr) => [...new Set(arr.map((t) => t.trim()).filter(Boolean))]),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
