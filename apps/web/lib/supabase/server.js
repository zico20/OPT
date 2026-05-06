import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Server-side Supabase client for App Router (route handlers, server
// components). Wires Next's cookie store into Supabase so session cookies
// the browser sets on auth events are read back here.
//
// Use `getSupabaseServerClient()` inside server components / route handlers.
// Inside middleware use the dedicated middleware helper (it needs to mutate
// the response cookies, not the request).
export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // When the env isn't configured (eg. local dev without auth set up, or a
  // staging environment that hasn't received the keys yet) return null
  // rather than throwing. Callers must handle the null case as "no auth".
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components are read-only — middleware handles the actual
          // cookie writes during navigation. Silently ignore here.
        }
      }
    }
  });
}

// Convenience: returns the current user's auth profile, or null if anonymous
// (or if Supabase auth isn't configured at all).
export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}
