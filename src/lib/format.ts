// Small display formatters for the dashboard. Temporary helpers that work off
// the mock data's ISO date strings and byte sizes until the DB is wired up.

// Human-friendly "time ago" for an ISO date string.
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  }
  if (diff < day) {
    return `${Math.round(diff / hour)}h ago`;
  }
  if (diff < 2 * day) {
    return "Yesterday";
  }
  if (diff < week) {
    return `${Math.round(diff / day)}d ago`;
  }
  return `${Math.round(diff / week)}w ago`;
}

// Compact file size, e.g. 253952 -> "248 KB".
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// Precise "how long to wait" from a seconds count, for rate-limit messages.
// e.g. 45 -> "45 seconds", 60 -> "1 minute", 92 -> "1 minute 32 seconds".
// Shared by the API 429 responses and the sign-in form (client), so it must
// stay free of any server-only imports.
export function formatRetryAfter(seconds: number): string {
  const total = Math.max(1, Math.ceil(seconds));
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  if (total < 60) return plural(total, "second");

  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return secs === 0
    ? plural(minutes, "minute")
    : `${plural(minutes, "minute")} ${plural(secs, "second")}`;
}
