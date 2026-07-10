import { Skeleton } from "@/components/ui/skeleton";

// Shown while the dashboard server component awaits its DB reads. Mirrors the
// page's layout (header, 4 stats, collections grid, recent items grid) so the
// content doesn't shift when it swaps in.
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Collections */}
      <section>
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Recent items */}
      <section>
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
