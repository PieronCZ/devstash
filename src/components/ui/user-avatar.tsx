import Image from "next/image";

import { cn } from "@/lib/utils";

// Derive up-to-two-letter initials from a name, e.g. "Brad Traversy" → "BT".
// Falls back to "?" when there's no usable name.
export function getInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface UserAvatarProps {
  name?: string | null;
  image?: string | null;
  /** Classes for the avatar box — control size, radius, and colors here. */
  className?: string;
}

// Reusable avatar: renders the user's image when present (e.g. from GitHub),
// otherwise falls back to their initials on a solid background.
export function UserAvatar({ name, image, className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground",
        className,
      )}
    >
      {image ? (
        <Image
          src={image}
          alt={name ?? "User avatar"}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
