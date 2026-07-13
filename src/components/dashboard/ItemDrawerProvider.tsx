"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import type { ItemDetail } from "@/lib/db/items";
import { ItemDrawer } from "@/components/dashboard/ItemDrawer";

interface ItemDrawerContextValue {
  // Open the drawer for an item, fetching its full detail on click.
  openItem: (id: string) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

// Access the item drawer from any card inside the app shell.
export function useItemDrawer(): ItemDrawerContextValue {
  const ctx = useContext(ItemDrawerContext);
  if (!ctx) {
    throw new Error("useItemDrawer must be used within an ItemDrawerProvider");
  }
  return ctx;
}

// Owns the single drawer instance and its open/loading/detail state, so the
// server-component pages can stay server components — cards just call openItem.
export function ItemDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Guards against a slow earlier fetch overwriting a newer one.
  const requestId = useRef(0);

  const openItem = useCallback((id: string) => {
    const reqId = ++requestId.current;
    setItem(null);
    setError(false);
    setLoading(true);
    setOpen(true);

    fetch(`/api/items/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load item (${res.status})`);
        return (await res.json()) as ItemDetail;
      })
      .then((data) => {
        if (reqId === requestId.current) setItem(data);
      })
      .catch(() => {
        if (reqId === requestId.current) setError(true);
      })
      .finally(() => {
        if (reqId === requestId.current) setLoading(false);
      });
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    // Invalidate any in-flight fetch so it doesn't repopulate a closed drawer.
    if (!next) requestId.current++;
  }, []);

  const handleDeleted = useCallback(() => {
    setOpen(false);
    requestId.current++;
  }, []);

  return (
    <ItemDrawerContext.Provider value={{ openItem }}>
      {children}
      <ItemDrawer
        open={open}
        onOpenChange={handleOpenChange}
        item={item}
        loading={loading}
        error={error}
        onItemUpdate={setItem}
        onDeleted={handleDeleted}
      />
    </ItemDrawerContext.Provider>
  );
}
