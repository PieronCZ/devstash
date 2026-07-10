// Maps the lucide icon names stored on item types to their actual
// components, so data can reference icons by string.

import {
  Code,
  File,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

const typeIcons: Record<string, LucideIcon> = {
  Code,
  Sparkles,
  Terminal,
  StickyNote,
  Link,
  File,
  Image,
};

// Resolve an item-type icon name to a component, falling back to File.
export function getTypeIcon(name: string): LucideIcon {
  return typeIcons[name] ?? File;
}
