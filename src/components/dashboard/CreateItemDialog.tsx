"use client";

import { createElement, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Code,
  File as FileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { createItem } from "@/actions/items";
import {
  CREATABLE_SYSTEM_TYPES,
  isUploadType,
  PRO_TYPES,
  resolveCreatableType,
  type CreatableSystemType,
} from "@/lib/item-types";
import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";
import { LanguageSelect } from "@/components/dashboard/LanguageSelect";
import {
  FileUpload,
  type UploadedFile,
} from "@/components/dashboard/FileUpload";
import { TagInput } from "@/components/dashboard/TagInput";
import { defaultLanguageForType } from "@/lib/languages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Display metadata for each creatable type's selector option — label, icon, and
// the type's brand color (matches the system-type colors used across the app).
const TYPE_META: Record<
  CreatableSystemType,
  { label: string; icon: LucideIcon; color: string }
> = {
  snippet: { label: "Snippet", icon: Code, color: "#3b82f6" },
  prompt: { label: "Prompt", icon: Sparkles, color: "#8b5cf6" },
  command: { label: "Command", icon: Terminal, color: "#f97316" },
  note: { label: "Note", icon: StickyNote, color: "#fde047" },
  link: { label: "Link", icon: LinkIcon, color: "#10b981" },
  file: { label: "File", icon: FileIcon, color: "#6b7280" },
  image: { label: "Image", icon: ImageIcon, color: "#ec4899" },
};

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
    >
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-destructive">
          *
        </span>
      ) : null}
    </label>
  );
}

// Default type when opened somewhere without a type context (e.g. dashboard).
const DEFAULT_TYPE = CREATABLE_SYSTEM_TYPES[0];

// Parse the current pathname (/items/<type>) into a creatable type, or null.
function typeFromPathname(pathname: string): CreatableSystemType | null {
  const match = pathname.match(/^\/items\/([^/]+)/);
  return match ? resolveCreatableType(match[1]) : null;
}

// "New item" button + modal for creating an item. Controlled local state (no form
// library, mirroring ItemDrawerEditForm); the server action's Zod schema is the
// real gate, this only guards the obvious (empty title). Which fields show is
// driven by the selected type so we never send fields the item can't hold.
export function CreateItemDialog() {
  const router = useRouter();
  const pathname = usePathname();
  // The type implied by the current /items/[type] page (null elsewhere).
  const pageType = typeFromPathname(pathname);

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<CreatableSystemType>(pageType ?? DEFAULT_TYPE);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState(
    defaultLanguageForType(pageType ?? DEFAULT_TYPE),
  );
  const [tags, setTags] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const isUpload = isUploadType(type);
  const showUpload = isUpload;
  const showUrl = type === "link";
  const showLanguage = type === "snippet" || type === "command";
  // Text types (snippet, command, prompt, note) hold a body; link uses `url`,
  // file/image use the upload — neither shows the content editor.
  const showContent = !isUpload && !showUrl;
  // snippet & command are the code types — they get the Monaco editor; other
  // text types (prompt, note) keep the plain Textarea.
  const isCode = showLanguage;

  function resetForm() {
    const initialType = pageType ?? DEFAULT_TYPE;
    setType(initialType);
    setTitle("");
    setDescription("");
    setContent("");
    setUrl("");
    setLanguage(defaultLanguageForType(initialType));
    setTags([]);
    setUploaded(null);
    setUploading(false);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Seed the type from the page we opened on (dashboard → first type).
      const initialType = pageType ?? DEFAULT_TYPE;
      setType(initialType);
      setLanguage(defaultLanguageForType(initialType));
    } else {
      // Start each open from a clean slate.
      resetForm();
    }
  }

  // Changing the type also navigates to that type's list page, keeping the
  // dialog and the page in sync in both directions.
  function handleTypeChange(next: CreatableSystemType) {
    setType(next);
    // Reset the language to the new type's default (command → bash, else unset).
    setLanguage(defaultLanguageForType(next));
    // A file uploaded for one kind shouldn't carry to another type.
    setUploaded(null);
    setUploading(false);
    if (next !== pageType) router.push(`/items/${next}`);
  }

  // Native form constraint validation (required inputs) gates submission and
  // drives the red border via :user-invalid — so this only runs once the form
  // is valid; no per-field "touched"/"submitted" bookkeeping needed.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Only send the fields the selected type can hold; the query layer maps the
    // rest. The schema trims/dedupes the tag array.
    const payload: Record<string, unknown> = {
      type,
      title,
      description,
      tags,
    };
    if (showContent) payload.content = content;
    if (showUrl) payload.url = url;
    if (showLanguage) payload.language = language;
    if (showUpload) {
      // The schema rejects a file/image item without a completed upload; guard
      // here too so the user gets a clear message instead of a Zod error.
      if (!uploaded) {
        setError("Please upload a file first.");
        return;
      }
      payload.fileUrl = uploaded.fileUrl;
      payload.fileName = uploaded.fileName;
      payload.fileSize = uploaded.fileSize;
    }

    startTransition(async () => {
      const res = await createItem(payload);
      if (res.success) {
        setOpen(false);
        resetForm();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        New item
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
          <DialogDescription>
            Stash a snippet, prompt, command, note, link, file, or image.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="flex flex-col gap-5">
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="create-type">Type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) =>
                handleTypeChange(value as CreatableSystemType)
              }
            >
              <SelectTrigger id="create-type">
                <SelectValue>
                  {(value: string) => {
                    const meta = TYPE_META[value as CreatableSystemType];
                    return (
                      <span className="flex items-center gap-2">
                        {createElement(meta.icon, {
                          className: "size-4",
                          style: { color: meta.color },
                        })}
                        {meta.label}
                      </span>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CREATABLE_SYSTEM_TYPES.map((name) => {
                  const { label, icon, color } = TYPE_META[name];
                  return (
                    <SelectItem key={name} value={name}>
                      <span className="flex flex-1 items-center gap-2">
                        {createElement(icon, {
                          className: "size-4",
                          style: { color },
                        })}
                        {label}
                        {PRO_TYPES.has(name) ? (
                          // Matches the sidebar's PRO badge (violet→pink gradient).
                          <Badge
                            variant="outline"
                            className="ml-auto h-4 border-0 bg-[linear-gradient(to_right,#8b5cf6,#ec4899)] px-1.5 text-[10px] font-semibold tracking-wide text-white uppercase"
                          >
                            Pro
                          </Badge>
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="create-title" required>
              Title
            </FieldLabel>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Title"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="create-description">Description</FieldLabel>
            <Textarea
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Upload — file & image items */}
          {showUpload ? (
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="create-upload" required>
                {type === "image" ? "Image" : "File"}
              </FieldLabel>
              <FileUpload
                kind={type as "file" | "image"}
                value={uploaded}
                onChange={setUploaded}
                onUploadingChange={setUploading}
              />
            </div>
          ) : null}

          {/* Content — text-kind items. Code types (snippet/command) use the
              Monaco editor; note & prompt use the Markdown editor. */}
          {showContent ? (
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="create-content">Content</FieldLabel>
              {isCode ? (
                <CodeEditor
                  value={content}
                  onChange={setContent}
                  language={language}
                  placeholder="Paste or write your code…"
                />
              ) : (
                <MarkdownEditor
                  id="create-content"
                  value={content}
                  onChange={setContent}
                  placeholder="Write Markdown…"
                />
              )}
            </div>
          ) : null}

          {/* Language — snippet & command only */}
          {showLanguage ? (
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="create-language">Language</FieldLabel>
              <LanguageSelect
                id="create-language"
                value={language}
                onChange={setLanguage}
              />
            </div>
          ) : null}

          {/* URL — link items */}
          {showUrl ? (
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="create-url" required>
                URL
              </FieldLabel>
              <Input
                id="create-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://…"
              />
            </div>
          ) : null}

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="create-tags">Tags</FieldLabel>
            <TagInput
              id="create-tags"
              value={tags}
              onChange={setTags}
              placeholder="Add tags, or pick existing…"
            />
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add. Existing tags are suggested as you
              type.
            </p>
          </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending} />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending || uploading}>
              {pending ? "Creating…" : uploading ? "Uploading…" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
