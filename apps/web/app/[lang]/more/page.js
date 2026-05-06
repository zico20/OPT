import Link from "next/link";
import MobileMoreContent from "../../../components/MobileMoreContent";
import PublicTopNav from "../../../components/PublicTopNav";
import { getLatestRun } from "../../../lib/data";
import { getMessages, normalizeLocale } from "../../../lib/i18n";
import { getTelegramSubscribeUrl } from "../../../lib/publicLinks";
import { getCurrentUser } from "../../../lib/supabase/server";

export default async function MorePage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);
  const latestRun = await getLatestRun();
  const telegramUrl = getTelegramSubscribeUrl();
  const user = await getCurrentUser();

  const shellClass = ["shell", messages.dir === "rtl" ? "rtl" : ""].filter(Boolean).join(" ");

  return (
    <div className={shellClass} dir={messages.dir}>
      <div className="m-route-mobile-only">
        <MobileMoreContent
          locale={locale}
          runDate={latestRun?.run_date || "-"}
          telegramUrl={telegramUrl}
          user={user ? { email: user.email, id: user.id } : null}
        />
      </div>

      <div className="m-route-desktop-only">
        <header className="masthead">
          <PublicTopNav locale={locale} messages={messages} currentPath="/more" />
        </header>
        <section className="panel" style={{ marginTop: 18 }}>
          <h1>Settings</h1>
          <p>Configure notifications, language, and access references.</p>
          <ul>
            <li><a href={telegramUrl} target="_blank" rel="noreferrer">Telegram bot</a></li>
            <li><Link href={"/" + locale + "/methodology"}>Methodology</Link></li>
            <li><a href="https://github.com/zico20/OPT" target="_blank" rel="noreferrer">Source code (GitHub)</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
