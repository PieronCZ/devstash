"use client";

import { createElement, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Pencil,
  Pin,
  Star,
  Trash2,
} from "lucide-react";

import type { ItemDetail } from "@/lib/db/items";
import { deleteItem, toggleFavorite, togglePin } from "@/actions/items";
import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";
import { ItemDrawerEditForm } from "@/components/dashboard/ItemDrawerEditForm";
import { getTypeIcon } from "@/lib/icons";
import { formatFileSize, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Absolute date, e.g. "Mar 12, 2025".
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

// The payload a user copies from the action bar / code header, by content kind.
function copyText(item: ItemDetail): string {
  if (item.contentType === "URL") return item.url ?? "";
  if (item.contentType === "FILE") return item.fileName ?? "";
  return item.content ?? "";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </h3>
  );
}

// The item's body, rendered by content kind. Code types use the readonly Monaco
// editor, note & prompt the readonly Markdown preview; both bring their own copy
// button, so the outer action-bar Copy still covers link/file.
function DetailBody({ item }: { item: ItemDetail }) {
  if (item.contentType === "FILE") {
    return (
      <p className="text-sm text-muted-foreground">
        {item.fileName ?? "Untitled file"}
        {item.fileSize != null ? ` · ${formatFileSize(item.fileSize)}` : ""}
      </p>
    );
  }

  if (item.contentType === "URL") {
    return item.url ? (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary break-all hover:underline"
      >
        <ExternalLink className="size-3.5 shrink-0" />
        {item.url}
      </a>
    ) : null;
  }

  if (!item.content) {
    return <p className="text-sm text-muted-foreground italic">No content.</p>;
  }

  // Code types (snippet/command) render in the readonly Monaco editor, which
  // brings its own macOS chrome, language label, and copy button.
  if (item.type.name === "snippet" || item.type.name === "command") {
    return (
      <CodeEditor value={item.content} language={item.language ?? undefined} readOnly />
    );
  }

  // Other text types (prompt, note) — rendered Markdown in the readonly editor,
  // which brings its own dark chrome and copy button.
  return <MarkdownEditor value={item.content} readOnly />;
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemDetail | null;
  loading: boolean;
  error: boolean;
  onItemUpdate: (item: ItemDetail) => void;
  onDeleted: () => void;
}

export function ItemDrawer({
  open,
  onOpenChange,
  item,
  loading,
  error,
  onItemUpdate,
  onDeleted,
}: ItemDrawerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Leave edit mode (and clear any flash) whenever a different item is opened, so
  // a reopened drawer always starts in view mode. Render-phase reset — React's
  // recommended pattern for syncing state to a changing prop (the provider nulls
  // `item` before each fetch, so reopening the same item resets too).
  const itemId = item?.id ?? null;
  const [prevItemId, setPrevItemId] = useState(itemId);
  if (itemId !== prevItemId) {
    setPrevItemId(itemId);
    setIsEditing(false);
    setFlash(null);
  }

  // Auto-dismiss the success flash.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  function handleSaved(updated: ItemDetail) {
    onItemUpdate(updated);
    setIsEditing(false);
    setFlash("Changes saved");
    router.refresh();
  }

  function handleFavorite() {
    if (!item) return;
    startTransition(async () => {
      const res = await toggleFavorite(item.id);
      if (res.success) {
        onItemUpdate({ ...item, isFavorite: res.isFavorite });
        router.refresh();
      }
    });
  }

  function handlePin() {
    if (!item) return;
    startTransition(async () => {
      const res = await togglePin(item.id);
      if (res.success) {
        onItemUpdate({ ...item, isPinned: res.isPinned });
        router.refresh();
      }
    });
  }

  function handleCopy() {
    if (!item) return;
    void navigator.clipboard.writeText(copyText(item)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDelete() {
    if (!item) return;
    startTransition(async () => {
      const res = await deleteItem(item.id);
      if (res.success) {
        onDeleted();
        router.refresh();
      }
    });
  }

  const TypeIcon = item ? getTypeIcon(item.type.icon) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {loading || !item ? (
          error ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Couldn&apos;t load this item.
            </div>
          ) : (
            <>
              {/* Title is required by the Sheet for a11y even while loading. */}
              <SheetHeader className="sr-only">
                <SheetTitle>Loading item</SheetTitle>
              </SheetHeader>
              <DrawerSkeleton />
            </>
          )
        ) : (
          <>
            {/* Header — type badge */}
            <SheetHeader className="flex-row items-center gap-2 pr-12">
              {TypeIcon ? (
                <span
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${item.type.color}1a`,
                    color: item.type.color,
                  }}
                >
                  {createElement(TypeIcon, { className: "size-4" })}
                </span>
              ) : null}
              <span
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: item.type.color }}
              >
                {item.type.name}
              </span>
            </SheetHeader>

            {isEditing ? (
              <>
                <SheetTitle className="sr-only">
                  Edit {item.title}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Edit this item&apos;s fields.
                </SheetDescription>
                <ItemDrawerEditForm
                  item={item}
                  onCancel={() => setIsEditing(false)}
                  onSaved={handleSaved}
                />
              </>
            ) : (
            <div className="flex flex-col gap-5 px-4 pb-6">
              {/* Success flash — shown briefly after a save. */}
              {flash ? (
                <p
                  role="status"
                  className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
                >
                  <Check className="size-4" />
                  {flash}
                </p>
              ) : null}

              {/* Title + description */}
              <div className="flex flex-col gap-1">
                <SheetTitle className="text-lg leading-tight">
                  {item.title}
                </SheetTitle>
                {item.description ? (
                  <SheetDescription>{item.description}</SheetDescription>
                ) : null}
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFavorite}
                  disabled={pending}
                  aria-pressed={item.isFavorite}
                >
                  <Star
                    className={
                      item.isFavorite ? "fill-amber-400 text-amber-400" : ""
                    }
                  />
                  Favorite
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePin}
                  disabled={pending}
                  aria-pressed={item.isPinned}
                >
                  <Pin className={item.isPinned ? "fill-current" : ""} />
                  Pin
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="text-emerald-500" /> : <Copy />}
                  Copy
                </Button>

                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit item"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete item"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        />
                      }
                    >
                      <Trash2 />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &ldquo;{item.title}&rdquo; will be permanently deleted.
                          This can&apos;t be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={pending}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Content */}
              <DetailBody item={item} />

              {/* Tags */}
              {item.tags.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <SectionLabel>Tags</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Collections */}
              {item.collections.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <SectionLabel>In Collections</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {item.collections.map((name) => (
                      <span
                        key={name}
                        className="rounded-md border px-2 py-0.5 text-xs text-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Timestamps */}
              <Separator />
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Created {formatDate(item.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Last updated {relativeTime(item.updatedAt)}
                </span>
              </div>
            </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
