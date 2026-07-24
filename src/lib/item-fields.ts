// Shared logic for the item create/edit forms. Which type-specific fields a
// form shows (content / url / language) is driven by the item's content kind,
// and only the shown fields are sent to the server action — so the two forms
// agree on the mapping in one place.

// Which type-specific fields apply, and whether content is code (Monaco) vs
// Markdown. `showUpload` is create-only (edit can't swap a file).
export interface ItemFieldFlags {
  showContent: boolean;
  showUrl: boolean;
  showLanguage: boolean;
  isCode: boolean;
}

// The type-specific values a form holds. Only the fields flagged on are read.
export interface ItemFieldValues {
  content: string;
  url: string;
  language: string;
}

// The subset of the mutation payload that depends on the item's type: `content`
// for text items, `url` for links, `language` for code. Both forms spread this
// into their own base payload (title/description/tags, plus type/file on create).
// Omitting a field entirely leaves it untouched by the query layer.
export function typeSpecificPayload(
  flags: ItemFieldFlags,
  values: ItemFieldValues,
): { content?: string; url?: string; language?: string } {
  const payload: { content?: string; url?: string; language?: string } = {};
  if (flags.showContent) payload.content = values.content;
  if (flags.showUrl) payload.url = values.url;
  if (flags.showLanguage) payload.language = values.language;
  return payload;
}
