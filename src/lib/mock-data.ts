// Temporary mock data for the dashboard UI.
// Only the current user remains on mock data until auth lands; everything
// else (item types, collections, items) now comes from the database.

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isPro: boolean;
}

// ───────────────────────── Current user ─────────────────────────

export const currentUser: User = {
  id: "user_1",
  name: "Devon Sinclair",
  email: "devon@devstash.io",
  image: null,
  isPro: false,
};
