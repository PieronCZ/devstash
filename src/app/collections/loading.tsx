import { Skeleton } from "@/components/ui/skeleton";

// Shown while the collections list server component awaits its DB read. Mirrors
// the page layout (header + card grid) so swap-in doesn't shift content.
export default function CollectionsLoading() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>

      {/* Collections grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
