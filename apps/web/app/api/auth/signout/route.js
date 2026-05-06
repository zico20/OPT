import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST sign-out endpoint. Clears the Supabase session cookies and redirects
// the caller back to the locale-aware home (or wherever `next` says).
export async function POST(request) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const { searchParams, origin } = new URL(request.url);
  const rawNext = searchParams.get("next") || "/";
  const next = rawNext.startsWith("/") ? rawNext : "/";

  return NextResponse.json({ ok: true, redirect: `${origin}${next}` });
}
