import { z } from "zod";

import { CREATABLE_SYSTEM_TYPES } from "@/lib/item-types";

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

// Payload for creating an item from the New Item dialog. `type` selects one of
// the creatable system types (file/image excluded — those need an upload flow);
// the storage `contentType` and which body field is used are derived from it.
// Type-specific fields (content/url/language) are optional and only sent for the
// relevant type. Only `title` is universally required; `url` is required for
// link items (enforced below).
export const createItemSchema = z
  .object({
    type: z.enum(CREATABLE_SYSTEM_TYPES),
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z
      .preprocess(emptyToNull, z.string().trim().nullable())
      .optional(),
    content: z.preprocess(emptyToNull, z.string().nullable()).optional(),
    url: z
      .preprocess(
        emptyToNull,
        z.string().trim().url("Must be a valid URL").nullable(),
      )
      .optional(),
    language: z.preprocess(emptyToNull, z.string().trim().nullable()).optional(),
    tags: z
      .array(z.string())
      .transform((arr) => [...new Set(arr.map((t) => t.trim()).filter(Boolean))]),
  })
  .superRefine((data, ctx) => {
    // Link items are useless without a URL — the one type-specific requirement.
    if (data.type === "link" && !data.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "URL is required",
      });
    }
  });

export type CreateItemInput = z.infer<typeof createItemSchema>;
