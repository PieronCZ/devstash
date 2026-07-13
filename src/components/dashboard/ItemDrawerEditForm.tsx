"use client";

import { useState, useTransition } from "react";
import { Save, X } from "lucide-react";

import type { ItemDetail } from "@/lib/db/items";
import { updateItem } from "@/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
    >
      {children}
    </label>
  );
}

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
  const [language, setLanguage] = useState(item.language ?? "");
  const [tags, setTags] = useState(item.tags.join(", "));

  const showContent = item.contentType === "TEXT";
  const showUrl = item.contentType === "URL";
  const showLanguage =
    item.type.name === "snippet" || item.type.name === "command";

  const titleEmpty = title.trim() === "";

  function handleSave() {
    if (titleEmpty) return;
    setError(null);

    // Only send the fields the item's type can hold; the query layer leaves any
    // omitted field untouched. Tags are split here; the schema trims/dedupes.
    const payload: Record<string, unknown> = {
      title,
      description,
      tags: tags.split(","),
    };
    if (showContent) payload.content = content;
    if (showUrl) payload.url = url;
    if (showLanguage) payload.language = language;

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
    <div className="flex flex-col gap-5 px-4 pb-6">
      {/* Save / Cancel bar — replaces the view-mode action bar. */}
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={handleSave} disabled={pending || titleEmpty}>
          <Save />
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
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

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="edit-title">Title</FieldLabel>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={titleEmpty}
          placeholder="Title"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="edit-description">Description</FieldLabel>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </div>

      {/* Content — text-kind items */}
      {showContent ? (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="edit-content">Content</FieldLabel>
          <Textarea
            id="edit-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content"
            rows={8}
            className="font-mono text-xs"
          />
        </div>
      ) : null}

      {/* Language — snippet & command only */}
      {showLanguage ? (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="edit-language">Language</FieldLabel>
          <Input
            id="edit-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="e.g. typescript"
          />
        </div>
      ) : null}

      {/* URL — link items */}
      {showUrl ? (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="edit-url">URL</FieldLabel>
          <Input
            id="edit-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      ) : null}

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="edit-tags">Tags</FieldLabel>
        <Input
          id="edit-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Comma-separated, e.g. react, hooks"
        />
        <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
      </div>
    </div>
  );
}
