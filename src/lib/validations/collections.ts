import { z } from "zod";

// Coerce empty/whitespace-only strings to null so an optional field left blank
// persists as null rather than an empty string (mirrors the item schemas).
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

// Payload for creating a collection from the New Collection dialog. A collection
// only needs a name; the description is optional. Collections hold items of any
// type, so there are no type-specific fields here.
export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z
    .preprocess(emptyToNull, z.string().trim().nullable())
    .optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
