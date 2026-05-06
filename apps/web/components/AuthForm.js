"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { pickAuthStrings } from "../lib/authStrings";

// Single auth form component, mode-switched via the `mode` prop:
//   "signin"  → email + password (and a magic link option)
//   "signup"  → email + password (sends confirmation email)
//
// Google OAuth button is always available; falls back to email if Google
// isn't configured in Supabase.
export default function AuthForm({ mode = "signin", locale = "en", redirectTo = "/" }) {
  const t = pickAuthStrings(locale);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // If Supabase isn't configured, render a friendly notice instead of a
  // broken form. Admins see this in dev / staging until env is wired up.
  if (!supabase) {
    return (
      <div className="auth-card">
        <h1 className="auth-title">{mode === "signin" ? t.signInTitle : t.signUpTitle}</h1>
        <p className="auth-subtitle">
          Authentication is not configured yet (missing NEXT_PUBLIC_SUPABASE_URL or
          NEXT_PUBLIC_SUPABASE_ANON_KEY). Please contact the site admin.
        </p>
      </div>
    );
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null); // { kind: "ok"|"err", text }

  const isSignIn = mode === "signin";
  const localePrefix = "/" + (locale || "en");
  const callbackUrl = (typeof window !== "undefined")
    ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`
    : null;

  // Map Supabase auth error codes / messages → localized text.
  function explainError(error) {
    const msg = String(error?.message || "").toLowerCase();
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) return t.invalidCredentials;
    if (msg.includes("rate limit") || msg.includes("too many")) return t.rateLimited;
    return t.genericError;
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setInfo(null);
    try {
      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setInfo({ kind: "err", text: explainError(error) });
          return;
        }
        router.replace(redirectTo);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl }
        });
        if (error) {
          setInfo({ kind: "err", text: explainError(error) });
          return;
        }
        // Supabase returns the user immediately; if email confirm is enabled,
        // session will be null until they click the confirmation link.
        if (data.session) {
          router.replace(redirectTo);
          router.refresh();
        } else {
          setInfo({ kind: "ok", text: t.confirmEmailSent });
        }
      }
    } catch (err) {
      setInfo({ kind: "err", text: t.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (busy || !email.trim()) return;
    setBusy(true);
    setInfo(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl }
      });
      if (error) {
        setInfo({ kind: "err", text: explainError(error) });
        return;
      }
      setInfo({ kind: "ok", text: t.linkSent });
    } catch (err) {
      setInfo({ kind: "err", text: t.genericError });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    setInfo(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl }
      });
      if (error) {
        setInfo({ kind: "err", text: explainError(error) });
        setBusy(false);
      }
      // On success Supabase redirects the browser; nothing to do here.
    } catch (err) {
      setInfo({ kind: "err", text: t.genericError });
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">{isSignIn ? t.signInTitle : t.signUpTitle}</h1>
      <p className="auth-subtitle">{isSignIn ? t.signInSubtitle : t.signUpSubtitle}</p>

      <button
        type="button"
        className="auth-google-btn"
        onClick={handleGoogle}
        disabled={busy}
        aria-label={t.googleBtn}
      >
        <span className="auth-google-icon" aria-hidden="true">
          {/* Inline Google "G" mark — keeps us off CDN dependencies */}
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </span>
        {t.googleBtn}
      </button>

      <div className="auth-divider"><span>{t.or}</span></div>

      <form className="auth-form" onSubmit={handlePasswordSubmit}>
        <label className="auth-label">
          <span>{t.emailLabel}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            required
            autoComplete="email"
            disabled={busy}
            className="auth-input"
          />
        </label>

        <label className="auth-label">
          <span>{t.passwordLabel}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignIn ? t.passwordSignInPlaceholder : t.passwordPlaceholder}
            required
            autoComplete={isSignIn ? "current-password" : "new-password"}
            minLength={isSignIn ? undefined : 8}
            disabled={busy}
            className="auth-input"
          />
          {!isSignIn && <span className="auth-hint">{t.passwordHint}</span>}
        </label>

        <button type="submit" className="auth-submit" disabled={busy || !email.trim() || !password}>
          {busy
            ? (isSignIn ? t.signingIn : t.creatingAccount)
            : (isSignIn ? t.signInBtn : t.signUpBtn)}
        </button>

        {isSignIn && (
          <button type="button" className="auth-link-btn" onClick={handleMagicLink} disabled={busy || !email.trim()}>
            {busy ? t.sendingLink : t.sendMagicLinkBtn}
          </button>
        )}
      </form>

      {info && (
        <div className={["auth-info", info.kind === "err" ? "auth-info-err" : "auth-info-ok"].join(" ")}>
          {info.text}
        </div>
      )}

      <div className="auth-switch">
        {isSignIn ? (
          <>
            {t.needAccount}{" "}
            <Link href={`${localePrefix}/signup`}>{t.signUpBtn}</Link>
          </>
        ) : (
          <>
            {t.haveAccount}{" "}
            <Link href={`${localePrefix}/signin`}>{t.signInBtn}</Link>
          </>
        )}
      </div>
    </div>
  );
}
