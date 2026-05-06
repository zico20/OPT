"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Reads tokens from cookies, so it stays in
// sync with the server's view of the session (no manual localStorage games).
//
// Memoized via the global because Next.js can re-execute this module on hot
// reload during dev; recreating the client every time would orphan auth
// listeners and waste sockets.
let browserClient = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Return null when not configured so callers can render a friendly
  // "auth not yet configured" state instead of crashing the bundle.
  if (!url || !anonKey) return null;
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
