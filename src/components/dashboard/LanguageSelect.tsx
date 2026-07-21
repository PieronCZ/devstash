"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, FileCode2 } from "lucide-react";
import {
  siApachegroovy,
  siC,
  siClojure,
  siCoffeescript,
  siCplusplus,
  siCss,
  siDart,
  siDocker,
  siElixir,
  siErlang,
  siGnubash,
  siGo,
  siGraphql,
  siHaskell,
  siHtml5,
  siJavascript,
  siJson,
  siJulia,
  siKotlin,
  siLua,
  siMarkdown,
  siMysql,
  siOpenjdk,
  siPerl,
  siPhp,
  siPostgresql,
  siPython,
  siR,
  siReact,
  siRuby,
  siRust,
  siSass,
  siScala,
  siSolidity,
  siSwift,
  siToml,
  siTypescript,
  siYaml,
  type SimpleIcon,
} from "simple-icons";

import { LANGUAGES, getLanguageLabel } from "@/lib/languages";
import { cn } from "@/lib/utils";

// Brand icons keyed by language id (simple-icons). Languages without a brand
// icon (plaintext, powershell, csharp, sql, …) fall back to a generic glyph.
const BRAND_ICONS: Record<string, SimpleIcon> = {
  bash: siGnubash,
  javascript: siJavascript,
  jsx: siReact,
  typescript: siTypescript,
  tsx: siReact,
  python: siPython,
  go: siGo,
  rust: siRust,
  java: siOpenjdk,
  kotlin: siKotlin,
  swift: siSwift,
  dart: siDart,
  cpp: siCplusplus,
  c: siC,
  ruby: siRuby,
  php: siPhp,
  scala: siScala,
  groovy: siApachegroovy,
  clojure: siClojure,
  elixir: siElixir,
  erlang: siErlang,
  haskell: siHaskell,
  lua: siLua,
  perl: siPerl,
  r: siR,
  julia: siJulia,
  solidity: siSolidity,
  coffeescript: siCoffeescript,
  html: siHtml5,
  css: siCss,
  scss: siSass,
  json: siJson,
  yaml: siYaml,
  toml: siToml,
  markdown: siMarkdown,
  mysql: siMysql,
  pgsql: siPostgresql,
  graphql: siGraphql,
  dockerfile: siDocker,
};

// WCAG relative luminance of a `RRGGBB` hex (no leading #), 0 (black) → 1 (white).
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

// Render each icon in its brand color, but fall back to `currentColor` (which
// adapts to the theme) for near-black/near-white logos like Rust or JSON that
// would otherwise vanish against the popover.
function brandFill(hex: string): string {
  const lum = luminance(hex);
  return lum < 0.22 || lum > 0.9 ? "currentColor" : `#${hex}`;
}

function LanguageIcon({ id, className }: { id: string; className?: string }) {
  const icon = BRAND_ICONS[id];
  if (!icon) {
    return (
      <FileCode2 className={cn("size-4 text-muted-foreground", className)} />
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill={brandFill(icon.hex)}
      aria-hidden
      className={cn("size-4", className)}
    >
      <path d={icon.path} />
    </svg>
  );
}

interface LanguageSelectProps {
  value: string;
  onChange: (id: string) => void;
  id?: string;
}

// A searchable single-select for the code editor's language. Mirrors TagInput's
// interaction model (outside-click close, keyboard nav, onMouseDown pick) rather
// than pulling in a separate combobox primitive. Renders a brand icon + label
// per language; picking one sets the editor's syntax highlighting.
export function LanguageSelect({ value, onChange, id }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q) || l.id.toLowerCase().includes(q),
    );
  }, [query]);

  // Focus the search box when the dropdown opens.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Keep the highlighted option scrolled into view during keyboard nav.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // Close on an outside click.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function select(langId: string) {
    onChange(langId);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (filtered[activeIndex]) select(filtered[activeIndex].id);
        break;
      }
      case "Escape": {
        event.preventDefault();
        setOpen(false);
        setQuery("");
        break;
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
      >
        <span className="flex items-center gap-2">
          <LanguageIcon id={value} />
          {getLanguageLabel(value)}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          <div className="border-b p-1">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // Reset the highlight to the top as the filter narrows.
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search languages…"
              className="w-full bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} className="max-h-60 overflow-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                No language found.
              </li>
            ) : (
              filtered.map((lang, index) => (
                <li key={lang.id}>
                  <button
                    type="button"
                    // onMouseDown so the pick registers before the search
                    // input's blur / outside-click closes the dropdown.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(lang.id);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                      index === activeIndex && "bg-accent text-accent-foreground",
                    )}
                  >
                    <LanguageIcon id={lang.id} className="shrink-0" />
                    <span className="flex-1">{lang.label}</span>
                    {lang.id === value ? <Check className="size-4" /> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
