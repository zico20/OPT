import Link from "next/link";
import AdminDashboard from "../../../components/AdminDashboard";
import AdminLogoutButton from "../../../components/AdminLogoutButton";
import LocaleSwitch from "../../../components/LocaleSwitch";
import { requireAdminPage } from "../../../lib/adminAuth";
import { getAlertRules, getSubscribers } from "../../../lib/data";
import { getMessages, normalizeLocale } from "../../../lib/i18n";

export const metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminPage({ params }) {
  const { lang } = await params;
  const locale = normalizeLocale(lang);
  const messages = getMessages(locale);

  await requireAdminPage(locale);

  const [initialRules, initialSubscribers] = await Promise.all([
    getAlertRules(),
    getSubscribers()
  ]);

  return (
    <div className={`shell admin-shell ${messages.dir === "rtl" ? "rtl" : ""}`} dir={messages.dir}>
      <header className="masthead admin-masthead">
        <div className="hero-grid compact">
          <div className="hero-copy">
            <span className="eyebrow">{messages.admin.eyebrow}</span>
            <h1>{messages.admin.title}</h1>
            <p>{messages.admin.intro}</p>

            <div className="topnav">
              <Link href={`/${locale}`}>{messages.nav.dashboard}</Link>
              <Link className="secondary" href={`/${locale}/alerts`}>
                {messages.nav.alerts}
              </Link>
              <AdminLogoutButton locale={locale} label={messages.admin.logout} />
            </div>
          </div>
        </div>

        <LocaleSwitch locale={locale} path="/admin" locales={messages.locales} />
      </header>

      <section style={{ marginTop: 18 }}>
        <AdminDashboard
          initialRules={initialRules}
          initialSubscribers={initialSubscribers}
          labels={messages.admin}
          locale={locale}
        />
      </section>
    </div>
  );
}
