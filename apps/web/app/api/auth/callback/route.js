import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// OAuth + magic-link return URL.
// Supabase appends `?code=…` after the user clicks the link / completes the
// OAuth dance. We exchange that code for a session (stored in cookies via
// the SSR client), then redirect to whatever path was in `next`.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || "/";
  const next = rawNext.startsWith("/") ? rawNext : "/";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Log so it shows up in journalctl, but don't leak details to the URL.
      console.error("[auth/callback] exchange failed:", error.message);
      return NextResponse.redirect(`${origin}/en/signin?err=callback`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
