"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import type { SearchData } from "@/lib/db/search";
import { CommandPalette } from "@/components/dashboard/CommandPalette";

// Platform detection that is hydration-safe: the server (and first client paint)
// see `false`, then React swaps to the real value — no setState-in-effect.
const noopSubscribe = () => () => {};
function useIsMac(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /mac/i.test(navigator.platform),
    () => false,
  );
}

interface CommandPaletteContextValue {
  // Open the command palette (e.g. from the top-bar search button).
  openPalette: () => void;
  // Whether the current platform is macOS — drives the ⌘K vs Ctrl K hint.
  isMac: boolean;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

// Access the command palette from any component inside the app shell.
export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider",
    );
  }
  return ctx;
}

// Owns the palette's open state and the global Cmd+K / Ctrl+K shortcut, and
// provides `openPalette` (for the top-bar search button). The searchable data is
// fetched server-side in AppShell and passed in, so it re-fetches on
// router.refresh() after any create/edit — no per-keystroke round-trips.
export function CommandPaletteProvider({
  data,
  children,
}: {
  data: SearchData;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isMac = useIsMac();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const openPalette = useCallback(() => setOpen(true), []);

  return (
    <CommandPaletteContext.Provider value={{ openPalette, isMac }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} data={data} />
    </CommandPaletteContext.Provider>
  );
}
