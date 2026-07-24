import { CodeEditor } from "@/components/dashboard/CodeEditor";
import { MarkdownEditor } from "@/components/dashboard/MarkdownEditor";

// The Content editor shared by the item create & edit forms: code types
// (snippet/command) get the Monaco editor, other text types (prompt/note) get
// the Markdown editor. `markdownId` wires the field's label to the Markdown
// textarea (the Monaco editor has no focusable input to target).
export function ItemContentEditor({
  isCode,
  value,
  onChange,
  language,
  markdownId,
}: {
  isCode: boolean;
  value: string;
  onChange: (value: string) => void;
  language?: string;
  markdownId: string;
}) {
  return isCode ? (
    <CodeEditor
      value={value}
      onChange={onChange}
      language={language}
      placeholder="Paste or write your code…"
    />
  ) : (
    <MarkdownEditor
      id={markdownId}
      value={value}
      onChange={onChange}
      placeholder="Write Markdown…"
    />
  );
}
