import { Skeleton } from "@/components/ui/skeleton";

// Shown while the items list server component awaits its DB reads. Rendered
// immediately on navigation (e.g. switching types in the sidebar) so the click
// feels instant instead of waiting on the server render. Mirrors the page's
// layout (header + two-column card grid) to avoid a content shift on swap-in.
export default function ItemsLoading() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-16" />
      </div>

      {/* Items grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
