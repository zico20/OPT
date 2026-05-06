import Link from "next/link";
import LocaleSwitch from "./LocaleSwitch";
import TelegramSubscribePanel from "./TelegramSubscribePanel";
import PushSubscribeButton from "./PushSubscribeButton";
import AuthMenu from "./AuthMenu";
import { getCurrentUser } from "../lib/supabase/server";

export default async function PublicTopNav({ locale, messages, currentPath = "/" }) {
  const user = await getCurrentUser();
  const links = [
    { href: `/${locale}`, label: messages.nav.dashboard, match: "/" },
    { href: `/${locale}/alerts`, label: messages.nav.alerts, match: "/alerts" },
    { href: `/${locale}/map`, label: messages.nav.map || "Map", match: "/map" },
    { href: `/${locale}/methodology`, label: messages.nav.methodology, match: "/methodology" }
  ];

  return (
    <div className="hero-topbar topbar-pill">
      <nav className="topbar-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={["topbar-link", currentPath === link.match ? "active" : ""].filter(Boolean).join(" ")}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-actions">
        <div className="topbar-telegram-slot">
          <TelegramSubscribePanel
            messages={messages}
            title={messages.home.subscriptionTitle}
            body={messages.home.subscriptionBody}
            buttonOnly
            compact
          />
        </div>
        <PushSubscribeButton />
        <AuthMenu user={user} locale={locale} currentPath={currentPath} />
        <LocaleSwitch
          locale={locale}
          path={currentPath}
          locales={messages.locales}
          className="public-locale-switch hero-topbar-locale"
        />
      </div>
    </div>
  );
}
