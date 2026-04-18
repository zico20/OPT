import Link from "next/link";
import AdminLoginForm from "../../../../components/AdminLoginForm";
import LocaleSwitch from "../../../../components/LocaleSwitch";
import { isAdminAuthenticated, isAdminConfigured } from "../../../../lib/adminAuth";
import { getMessages, normalizeLocale } from "../../../../lib/i18n";
import { redirect } from "next/navigation";

export const metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminLoginPage({ params }) {
  const { lang } = await params;
  const locale = normalizeLocale(lang);
  const messages = getMessages(locale);

  if (await isAdminAuthenticated()) {
    redirect(`/${locale}/admin`);
  }

  return (
    <div className={`shell admin-shell ${messages.dir === "rtl" ? "rtl" : ""}`} dir={messages.dir}>
      <header className="masthead masthead-compact admin-masthead">
        <span className="eyebrow">{messages.admin.loginEyebrow}</span>
        <h1>{messages.admin.loginTitle}</h1>
        <p>{messages.admin.loginIntro}</p>

        <div className="topnav">
          <Link href={`/${locale}`}>{messages.nav.dashboard}</Link>
          <Link className="secondary" href={`/${locale}/alerts`}>
            {messages.nav.alerts}
          </Link>
        </div>

        <LocaleSwitch locale={locale} path="/admin/login" locales={messages.locales} />
      </header>

      <section className="section-grid" style={{ marginTop: 22 }}>
        <article className="panel admin-panel" style={{ gridColumn: "span 7" }}>
          {isAdminConfigured() ? (
            <AdminLoginForm locale={locale} labels={messages.admin} />
          ) : (
            <div className="stack-gap">
              <h2>{messages.admin.configMissingTitle}</h2>
              <p>{messages.admin.configMissingBody}</p>
            </div>
          )}
        </article>

        <aside className="panel admin-panel admin-panel-dark" style={{ gridColumn: "span 5" }}>
          <h2>{messages.admin.securityTitle}</h2>
          <div className="feature-list">
            <div className="feature-item">{messages.admin.securityItem1}</div>
            <div className="feature-item">{messages.admin.securityItem2}</div>
            <div className="feature-item">{messages.admin.securityItem3}</div>
          </div>
        </aside>
      </section>
    </div>
  );
}
