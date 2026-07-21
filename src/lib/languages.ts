// The languages offered in the code editor's language picker. `id` is the value
// we store on the item (and hand to Monaco for highlighting — CodeEditor's alias
// map resolves the few that differ, e.g. bash → shell). Keep this list broad but
// curated; it's what the searchable LanguageSelect renders.

export interface LanguageOption {
  id: string;
  label: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: "plaintext", label: "Plain Text" },
  { id: "bash", label: "Bash" },
  { id: "powershell", label: "PowerShell" },
  { id: "bat", label: "Batch" },
  { id: "javascript", label: "JavaScript" },
  { id: "jsx", label: "JSX (React)" },
  { id: "typescript", label: "TypeScript" },
  { id: "tsx", label: "TSX (React)" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
  { id: "kotlin", label: "Kotlin" },
  { id: "swift", label: "Swift" },
  { id: "dart", label: "Dart" },
  { id: "csharp", label: "C#" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "objective-c", label: "Objective-C" },
  { id: "ruby", label: "Ruby" },
  { id: "php", label: "PHP" },
  { id: "scala", label: "Scala" },
  { id: "groovy", label: "Groovy" },
  { id: "clojure", label: "Clojure" },
  { id: "elixir", label: "Elixir" },
  { id: "erlang", label: "Erlang" },
  { id: "haskell", label: "Haskell" },
  { id: "lua", label: "Lua" },
  { id: "perl", label: "Perl" },
  { id: "r", label: "R" },
  { id: "julia", label: "Julia" },
  { id: "solidity", label: "Solidity" },
  { id: "coffeescript", label: "CoffeeScript" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "scss", label: "SCSS" },
  { id: "less", label: "Less" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "toml", label: "TOML" },
  { id: "xml", label: "XML" },
  { id: "ini", label: "INI" },
  { id: "markdown", label: "Markdown" },
  { id: "sql", label: "SQL" },
  { id: "mysql", label: "MySQL" },
  { id: "pgsql", label: "PostgreSQL" },
  { id: "graphql", label: "GraphQL" },
  { id: "dockerfile", label: "Dockerfile" },
];

// Display label for a stored language id. Unknown/empty falls back to the raw
// value (or "Plain Text" when empty) so we never render blank.
export function getLanguageLabel(id: string | null | undefined): string {
  if (!id) return "Plain Text";
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}

// The language a newly created item of this type should default to. Commands are
// shell scripts, so they start as Bash; everything else starts unset (plaintext).
export function defaultLanguageForType(typeName: string): string {
  return typeName === "command" ? "bash" : "";
}
