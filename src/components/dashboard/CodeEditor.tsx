"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount, BeforeMount } from "@monaco-editor/react";
import { Check, Copy } from "lucide-react";

import { getLanguageLabel } from "@/lib/languages";
import { cn } from "@/lib/utils";

// Monaco is browser-only (it touches `window`/`navigator` on load), so it must
// never render on the server. next/dynamic with ssr:false keeps it out of the
// server bundle; the loading fallback mirrors the editor body height.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      className="animate-pulse bg-[#1e1e1e]"
      style={{ height: MIN_HEIGHT }}
    />
  ),
});

// Fluid height: the editor grows with its content, clamped to this range. Past
// the max, Monaco's own (themed) scrollbar takes over.
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 400;

// Our stored `language` is freeform (what the user typed). Map the common
// aliases onto Monaco's built-in language ids; anything unknown falls through
// and Monaco simply renders it as plain text (no error).
const LANGUAGE_ALIASES: Record<string, string> = {
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  shell: "shell",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  yml: "yaml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
  golang: "go",
};

function resolveMonacoLanguage(language?: string): string {
  const key = language?.trim().toLowerCase();
  if (!key) return "plaintext";
  return LANGUAGE_ALIASES[key] ?? key;
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

// A Monaco-based code editor with macOS-window chrome and a header (language +
// quick copy). Used for snippet/command content only — other text types keep the
// plain Textarea. Supports edit (onChange) and readonly (display) modes; the
// theme is always dark, terminal-style, regardless of the app's light/dark mode.
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  placeholder,
  className,
}: CodeEditorProps) {
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [copied, setCopied] = useState(false);

  const monacoLanguage = resolveMonacoLanguage(language);
  // Friendly label (matches the LanguageSelect), e.g. "TSX (React)" not "tsx".
  const languageLabel = getLanguageLabel(language);

  // Define a dark theme that blends the editor into the surrounding chrome.
  const handleBeforeMount: BeforeMount = (monaco) => {
    // This is a snippet stash, not an IDE: turn off the TS/JS worker's
    // diagnostics so a correct-but-context-free snippet (e.g. a TSX component
    // that imports "react") isn't buried in red squiggles. Enabling JSX in the
    // compiler options keeps jsx/tsx highlighting accurate.
    const ts = monaco.languages.typescript;
    if (ts) {
      const diagnostics = {
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true,
      };
      const compilerOptions = {
        jsx: ts.JsxEmit.React,
        allowJs: true,
        allowNonTsExtensions: true,
        target: ts.ScriptTarget.Latest,
      };
      ts.typescriptDefaults.setDiagnosticsOptions(diagnostics);
      ts.javascriptDefaults.setDiagnosticsOptions(diagnostics);
      ts.typescriptDefaults.setCompilerOptions(compilerOptions);
      ts.javascriptDefaults.setCompilerOptions(compilerOptions);
    }

    monaco.editor.defineTheme("devstash-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1e1e1e",
        "editorGutter.background": "#1e1e1e",
        "editorLineNumber.foreground": "#4b5563",
        "editorLineNumber.activeForeground": "#9ca3af",
        "scrollbarSlider.background": "#ffffff1a",
        "scrollbarSlider.hoverBackground": "#ffffff33",
        "scrollbarSlider.activeBackground": "#ffffff4d",
      },
    });
  };

  // Size the editor to its content on mount and whenever the content height
  // changes, clamped to [MIN, MAX]. `automaticLayout` handles the reflow.
  const handleMount: OnMount = (editor) => {
    const update = () => {
      const next = Math.min(
        MAX_HEIGHT,
        Math.max(MIN_HEIGHT, editor.getContentHeight()),
      );
      setHeight(next);
    };
    editor.onDidContentSizeChange(update);
    update();
  };

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]",
        className,
      )}
    >
      {/* Header — macOS window dots + language + copy */}
      <div className="flex items-center justify-between border-b border-[#333] bg-[#252526] px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#9ca3af]">
            {languageLabel}
          </span>
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
      </div>

      {/* Editor body */}
      <div style={{ height }}>
        <MonacoEditor
          height={height}
          language={monacoLanguage}
          theme="devstash-dark"
          value={value}
          onChange={(next) => onChange?.(next ?? "")}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            readOnly,
            domReadOnly: readOnly,
            // Monaco's built-in placeholder positions itself correctly after the
            // gutter; only meaningful while editable.
            placeholder: readOnly ? undefined : placeholder,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12.5,
            lineHeight: 20,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            lineNumbers: "on",
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: readOnly ? "none" : "line",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              // Let the page scroll when the editor isn't scrollable.
              alwaysConsumeMouseWheel: false,
            },
            wordWrap: "off",
            tabSize: 2,
            automaticLayout: true,
            contextmenu: false,
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
