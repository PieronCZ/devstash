"use client";

import { useState, useTransition } from "react";
import { Save, X } from "lucide-react";

import type { ItemDetail } from "@/lib/db/items";
import { updateItem } from "@/actions/items";
import { LanguageSelect } from "@/components/dashboard/LanguageSelect";
import { Field } from "@/components/dashboard/Field";
import { ItemContentEditor } from "@/components/dashboard/ItemContentEditor";
import { typeSpecificPayload } from "@/lib/item-fields";
import { defaultLanguageForType } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ItemDrawerEditFormProps {
  item: ItemDetail;
  onCancel: () => void;
  onSaved: (item: ItemDetail) => void;
}

// Inline edit form for the item drawer. Controlled inputs with local state (no
// form library, per spec); the server action's Zod schema is the real gate, this
// just guards the obvious (empty title). Type-specific fields render only for
// the relevant content kind so we never send fields the item can't hold.
export function ItemDrawerEditForm({
  item,
  onCancel,
  onSaved,
}: ItemDrawerEditFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [content, setContent] = useState(item.content ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  // Default an unset command's language to bash (commands are shell scripts).
  const [language, setLanguage] = useState(
    item.language ?? defaultLanguageForType(item.type.name),
  );
  const [tags, setTags] = useState(item.tags.join(", "));

  const showContent = item.contentType === "TEXT";
  const showUrl = item.contentType === "URL";
  const showLanguage =
    item.type.name === "snippet" || item.type.name === "command";
  // Code types (snippet/command) edit content in the Monaco editor; other text
  // types (prompt, note) keep the Markdown editor.
  const isCode = showLanguage;

  // Native form constraint validation (the required title) gates submission and
  // drives the red border via :user-invalid — no "touched"/"empty" bookkeeping.
  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Only send the fields the item's type can hold; the query layer leaves any
    // omitted field untouched. Tags are split here; the schema trims/dedupes.
    const payload: Record<string, unknown> = {
      title,
      description,
      tags: tags.split(","),
      ...typeSpecificPayload(
        { showContent, showUrl, showLanguage, isCode },
        { content, url, language },
      ),
    };

    startTransition(async () => {
      const res = await updateItem(item.id, payload);
      if (res.success) {
        onSaved(res.item);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 px-4 pb-6">
      {/* Save / Cancel bar — replaces the view-mode action bar. */}
      <div className="flex items-center gap-1.5">
        <Button type="submit" size="sm" disabled={pending}>
          <Save />
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={pending}
        >
          <X />
          Cancel
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Field label="Title" htmlFor="edit-title">
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Title"
        />
      </Field>

      <Field label="Description" htmlFor="edit-description">
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </Field>

      {/* Content — text-kind items. Code types (snippet/command) use the Monaco
          editor; note & prompt use the Markdown editor. */}
      {showContent ? (
        <Field label="Content" htmlFor="edit-content">
          <ItemContentEditor
            isCode={isCode}
            value={content}
            onChange={setContent}
            language={language}
            markdownId="edit-content"
          />
        </Field>
      ) : null}

      {/* Language — snippet & command only */}
      {showLanguage ? (
        <Field label="Language" htmlFor="edit-language">
          <LanguageSelect
            id="edit-language"
            value={language}
            onChange={setLanguage}
          />
        </Field>
      ) : null}

      {/* URL — link items */}
      {showUrl ? (
        <Field label="URL" htmlFor="edit-url">
          <Input
            id="edit-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>
      ) : null}

      <Field label="Tags" htmlFor="edit-tags">
        <Input
          id="edit-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Comma-separated, e.g. react, hooks"
        />
        <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
      </Field>
    </form>
  );
}
