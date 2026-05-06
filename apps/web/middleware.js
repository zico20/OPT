import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase auth session on every request. Without this, access
// tokens expire after ~1 hour and the user appears anonymous on the next
// navigation even though they're "still signed in" client-side.
//
// The middleware also writes refreshed cookies back to the browser so they
// stay in sync with the server. Skip the daily-pipeline / health endpoints
// — they don't need a session and we don't want middleware overhead there.
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // No Supabase auth configured — pass through unchanged.
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  // Touching getUser() forces a token refresh if the access token is
  // expired and a valid refresh token exists. Result is intentionally
  // discarded; we just want the cookie side effects.
  await supabase.auth.getUser();

  return response;
}

// Run on every navigation EXCEPT static files, the favicon, and Next's
// internal _next/* paths. The pipeline/healthcheck JSON routes don't need
// session refresh either, but they're cheap enough to skip explicitly.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|api/healthcheck|api/run|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
