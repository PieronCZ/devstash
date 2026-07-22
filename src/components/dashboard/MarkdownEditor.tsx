"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

// Fluid height: the body grows with its content, clamped to this range. Past the
// max, the body scrolls — mirrors CodeEditor's behavior.
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 400;

type Tab = "write" | "preview";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

// A Markdown editor with Write/Preview tabs and macOS-window-less dark chrome
// matching CodeEditor (same container, header, and copy button). Used for note &
// prompt content only — code types keep the Monaco CodeEditor, links keep a URL
// field. Supports edit (onChange) and readonly (display) modes; the readonly mode
// only exposes the Preview tab. The theme is always dark regardless of app mode.
export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  className,
  id,
}: MarkdownEditorProps) {
  // Readonly starts (and stays) on Preview; edit mode defaults to Write.
  const [tab, setTab] = useState<Tab>(readOnly ? "preview" : "write");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-size the write textarea to its content, clamped to [MIN, MAX]. Past the
  // max it scrolls. Runs on value changes and when the Write tab becomes visible
  // (a hidden textarea has scrollHeight 0, so we must remeasure on show).
  useEffect(() => {
    if (readOnly || tab !== "write") return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight))}px`;
  }, [value, tab, readOnly]);

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // In readonly mode only Preview is available; edit mode exposes both tabs.
  const tabs: { id: Tab; label: string }[] = readOnly
    ? [{ id: "preview", label: "Preview" }]
    : [
        { id: "write", label: "Write" },
        { id: "preview", label: "Preview" },
      ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]",
        className,
      )}
    >
      {/* Header — Write/Preview tabs + copy */}
      <div className="flex items-center justify-between border-b border-[#333] bg-[#2d2d2d] px-2 py-1.5">
        <div className="flex items-center gap-1">
          {tabs.map(({ id: tabId, label }) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              className={cn(
                "cursor-pointer rounded px-2 py-0.5 text-xs transition-colors",
                tab === tabId
                  ? "bg-white/10 text-white"
                  : "text-[#9ca3af] hover:bg-white/5 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[#9ca3af] transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Body */}
      {tab === "write" && !readOnly ? (
        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
          className="block w-full resize-none overflow-y-auto bg-[#1e1e1e] px-3 py-3 font-mono text-xs leading-relaxed text-[#e5e7eb] outline-none placeholder:text-[#6b7280]"
        />
      ) : (
        <div
          className="markdown-preview overflow-y-auto px-3 py-3"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-xs text-[#6b7280] italic">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
