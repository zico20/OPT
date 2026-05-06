"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { pickAuthStrings } from "../lib/authStrings";

// Header/nav widget that shows either:
//   * a "Sign in" pill when the visitor is anonymous
//   * a small avatar + email + sign-out menu when they're authenticated
//
// Receives the current user from the server (so the first paint matches
// the SSR result and we don't flash a wrong state). The browser client is
// only used to fire the sign-out request.
export default function AuthMenu({ user, locale = "en", currentPath = "/" }) {
  const t = pickAuthStrings(locale);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const localePrefix = "/" + (locale || "en");
  const signInHref = `${localePrefix}/signin?next=${encodeURIComponent(currentPath || `/${locale}`)}`;

  async function signOut() {
    if (busy || !supabase) return;
    setBusy(true);
    try {
      await supabase.auth.signOut();
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  // If Supabase isn't configured, hide the menu entirely — there's nothing
  // useful to show until env is wired up.
  if (!supabase) return null;

  if (!user) {
    return (
      <Link href={signInHref} className="auth-menu-signin">
        {t.signInBtn}
      </Link>
    );
  }

  const email = user.email || user.user_metadata?.email || "";
  const initial = (email[0] || "?").toUpperCase();

  return (
    <div className="auth-menu" data-open={open || undefined}>
      <button
        type="button"
        className="auth-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.yourAccount}
        aria-expanded={open}
      >
        <span className="auth-menu-avatar" aria-hidden="true">{initial}</span>
      </button>

      {open && (
        <div className="auth-menu-dropdown" role="menu">
          <div className="auth-menu-userinfo">
            <span className="auth-menu-userinfo-label">{t.signedInAs}</span>
            <span className="auth-menu-userinfo-email">{email}</span>
          </div>
          <button
            type="button"
            className="auth-menu-signout"
            onClick={signOut}
            disabled={busy}
            role="menuitem"
          >
            {busy ? "…" : t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
