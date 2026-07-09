import { createElement } from "react";
import { Pin, Star } from "lucide-react";

import type { DashboardItem } from "@/lib/db/items";
import { getTypeIcon } from "@/lib/icons";
import { formatFileSize } from "@/lib/format";

// Type-appropriate preview: code block for languaged text, prose for notes/
// prompts, the URL for links, and name · size for files.
function ItemPreview({ item }: { item: DashboardItem }) {
  if (item.contentType === "FILE") {
    return (
      <p className="text-sm text-muted-foreground">
        {item.fileName}
        {item.fileSize != null ? ` · ${formatFileSize(item.fileSize)}` : ""}
      </p>
    );
  }

  if (item.contentType === "URL") {
    return <p className="truncate text-sm text-muted-foreground">{item.url}</p>;
  }

  if (item.language) {
    return (
      <pre className="line-clamp-3 overflow-hidden rounded-md bg-muted/60 p-2.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        {item.content}
      </pre>
    );
  }

  return (
    <p className="line-clamp-3 text-sm text-muted-foreground whitespace-pre-line">
      {item.content}
    </p>
  );
}

export function ItemCard({ item }: { item: DashboardItem }) {
  const { color, icon: iconName, name } = item.type;
  const icon = getTypeIcon(iconName);
  // Type names are stored singular ("snippet"); the CSS uppercases the label.
  const label = name;

  return (
    <div
      style={{ borderLeftColor: color }}
      className="flex flex-col rounded-xl border border-l-2 bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase"
          style={{ color }}
        >
          {createElement(icon, { className: "size-3.5" })}
          {label}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {item.isPinned ? <Pin className="size-3.5" /> : null}
          {item.isFavorite ? (
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
      </div>

      <h3 className="mt-2 font-medium leading-tight">{item.title}</h3>

      <div className="mt-2">
        <ItemPreview item={item} />
      </div>

      {item.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
