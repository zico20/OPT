import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");
  const rawNext = searchParams.get("next") || "/";
  const next = rawNext.startsWith("/") ? rawNext : "/";

  console.log("[auth/callback] hit:", JSON.stringify({
    hasCode: !!code,
    codeLen: code ? code.length : 0,
    errorParam,
    errorDesc,
    next
  }));

  const response = NextResponse.redirect(`${origin}${next}`);

  if (!code) {
    console.warn("[auth/callback] no code in URL");
    return NextResponse.redirect(`${origin}/en/signin?err=nocode`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("[auth/callback] missing supabase env");
    return response;
  }

  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map(c => c.name);
  console.log("[auth/callback] cookies:", cookieNames.join(", ") || "(none)");

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          // Log raw options once so we can see what supabase is asking for.
          console.log("[auth/callback] set cookie:", name, "opts:", JSON.stringify(options));
          // Strip Domain so the cookie is host-only on hazardsignal.com.
          // (If supabase ever passes domain: '.supabase.co' or similar, the
          //  browser would reject it for our origin.)
          const safeOpts = { ...options };
          delete safeOpts.domain;
          response.cookies.set(name, value, safeOpts);
        }
      }
    }
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange failed:", error.message, "code:", error.code, "status:", error.status);
    return NextResponse.redirect(`${origin}/en/signin?err=callback&msg=${encodeURIComponent(error.message)}`);
  }

  console.log("[auth/callback] exchange OK, user:", data?.user?.email || "(no email)");
  return response;
}
