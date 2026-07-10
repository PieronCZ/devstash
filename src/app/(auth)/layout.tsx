import Link from "next/link";
import { Boxes } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Boxes className="size-5" />
        </span>
        DevStash
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
