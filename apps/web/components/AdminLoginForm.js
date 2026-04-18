"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm({ locale = "en", labels = {} }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error || labels.loginError || "Unable to sign in.");
        return;
      }

      router.push(`/${locale}/admin`);
      router.refresh();
    } catch (requestError) {
      setError(labels.loginError || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-login-form">
      <label>
        {labels.password || "Password"}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={labels.passwordPlaceholder || "Enter the admin password"}
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? (labels.signingIn || "Signing in...") : (labels.loginBtn || "Open admin")}
      </button>
    </form>
  );
}
