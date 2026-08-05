import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { getPageNumbers } from "@/lib/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  // Route path the page links hang off, e.g. "/items/snippets" or
  // "/collections/abc". A `?page=` query is appended to it.
  basePath: string;
}

// Shared classes for one square control (page number, prev, next).
const cellClass =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border px-2 text-sm font-medium transition-colors";

// Numbered page links plus prev/next controls, centered at the bottom of a
// listing. Prev/next are greyed out (rendered as non-interactive spans) at the
// first/last page. Renders nothing when there's only a single page. Server
// component — navigation is plain `<Link>`s that change the `?page=` query.
export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const href = (page: number) => `${basePath}?page=${page}`;
  const tokens = getPageNumbers(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1.5"
    >
      {/* Previous */}
      {hasPrev ? (
        <Link
          href={href(currentPage - 1)}
          aria-label="Previous page"
          className={cn(cellClass, "hover:bg-accent hover:text-accent-foreground")}
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(cellClass, "cursor-not-allowed opacity-40")}
        >
          <ChevronLeft className="size-4" />
        </span>
      )}

      {/* Page numbers */}
      {tokens.map((token, i) =>
        token === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden="true"
            className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : token === currentPage ? (
          <span
            key={token}
            aria-current="page"
            className={cn(
              cellClass,
              "border-transparent bg-primary text-primary-foreground",
            )}
          >
            {token}
          </span>
        ) : (
          <Link
            key={token}
            href={href(token)}
            aria-label={`Page ${token}`}
            className={cn(cellClass, "hover:bg-accent hover:text-accent-foreground")}
          >
            {token}
          </Link>
        ),
      )}

      {/* Next */}
      {hasNext ? (
        <Link
          href={href(currentPage + 1)}
          aria-label="Next page"
          className={cn(cellClass, "hover:bg-accent hover:text-accent-foreground")}
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(cellClass, "cursor-not-allowed opacity-40")}
        >
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
