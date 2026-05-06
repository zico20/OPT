import AuthForm from "../../../components/AuthForm";
import { getCurrentUser } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ params, searchParams }) {
  const { lang } = await params;
  const sp = await searchParams;
  const next = typeof sp?.next === "string" && sp.next.startsWith("/") ? sp.next : `/${lang}`;

  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <main className="auth-shell" dir={lang === "ar" ? "rtl" : "ltr"}>
      <AuthForm mode="signup" locale={lang} redirectTo={next} />
    </main>
  );
}
