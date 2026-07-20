"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  placeholder?: string;
}

// A chip-style tag input with autocomplete against the user's existing tags.
// Typing (debounced) fetches matches from `/api/tags`; focusing or opening the
// dropdown with an empty box surfaces existing tags so you can pick without
// typing. Enter/comma adds the typed value (or the highlighted suggestion),
// Backspace on an empty box removes the last chip. New (non-existing) tags are
// created on submit by the server action — this only suggests, never restricts.
export function TagInput({ value, onChange, id, placeholder }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions (debounced) whenever the query changes while open.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        setSuggestions((await res.json()) as string[]);
      } catch {
        // Ignore aborts / network errors — suggestions are non-critical.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selected = new Set(value.map((t) => t.toLowerCase()));
  // Suggestions the user hasn't already added.
  const available = suggestions.filter((s) => !selected.has(s.toLowerCase()));

  const trimmed = query.trim();
  const canCreate =
    trimmed !== "" &&
    !selected.has(trimmed.toLowerCase()) &&
    !available.some((a) => a.toLowerCase() === trimmed.toLowerCase());

  // Options as rendered: existing matches first, then an optional "create" row.
  const optionCount = available.length + (canCreate ? 1 : 0);

  function addTag(tag: string) {
    const next = tag.trim();
    if (!next || selected.has(next.toLowerCase())) {
      setQuery("");
      setActiveIndex(-1);
      return;
    }
    onChange([...value, next]);
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  // Commit the highlighted option, or the create row, or the raw text.
  function commitActive() {
    if (activeIndex >= 0 && activeIndex < available.length) {
      addTag(available[activeIndex]);
    } else if (trimmed) {
      addTag(trimmed);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "Enter":
      case ",": {
        event.preventDefault();
        commitActive();
        break;
      }
      case "Backspace": {
        if (query === "" && value.length > 0) {
          event.preventDefault();
          removeTag(value[value.length - 1]);
        }
        break;
      }
      case "ArrowDown": {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((i) => Math.min(i + 1, optionCount - 1));
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      }
      case "Escape": {
        setOpen(false);
        setActiveIndex(-1);
        break;
      }
    }
  }

  const showDropdown = open && optionCount > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? (placeholder ?? "Add tags…") : ""}
          className="min-w-[8ch] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label="Show existing tags"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {showDropdown ? (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
          {available.map((suggestion, index) => (
            <li key={suggestion}>
              <button
                type="button"
                // onMouseDown (not onClick) so the pick registers before the
                // input's blur / outside-click closes the dropdown.
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex w-full items-center rounded px-2 py-1 text-left",
                  index === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                {suggestion}
              </button>
            </li>
          ))}
          {canCreate ? (
            <li>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(trimmed);
                }}
                onMouseEnter={() => setActiveIndex(available.length)}
                className={cn(
                  "flex w-full items-center rounded px-2 py-1 text-left text-muted-foreground",
                  activeIndex === available.length &&
                    "bg-accent text-accent-foreground",
                )}
              >
                Create <span className="ml-1 font-medium">“{trimmed}”</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
