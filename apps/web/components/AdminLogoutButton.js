"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton({ locale = "en", label = "Log out" }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/session", {
      method: "DELETE"
    });
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <button type="button" className="secondary" onClick={handleLogout}>
      {label}
    </button>
  );
}
