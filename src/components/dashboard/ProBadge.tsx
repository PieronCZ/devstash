import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// The PRO badge (violet→pink gradient) shown on file/image types across the app.
// `outline` variant so no bg-color sits under the gradient. `className` lets each
// site add positioning (e.g. `ml-auto`, or the sidebar's `mr-7` + collapse-hide).
export function ProBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-4 border-0 bg-[linear-gradient(to_right,#8b5cf6,#ec4899)] px-1.5 text-[10px] font-semibold tracking-wide text-white uppercase",
        className,
      )}
    >
      Pro
    </Badge>
  );
}
