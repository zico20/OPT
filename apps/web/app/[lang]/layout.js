import { redirect } from "next/navigation";
import InstallAppHint from "../../components/InstallAppHint";
import MobileBottomNav from "../../components/MobileBottomNav";
import ParticleCanvas from "../../components/ParticleCanvas";
import SoftRevealController from "../../components/SoftRevealController";
import SplashScreen from "../../components/SplashScreen";
import { getMessages, normalizeLocale } from "../../lib/i18n";

export default async function LocaleLayout({ children, params }) {
  const { lang } = await params;
  const safeLocale = normalizeLocale(lang);
  const messages = getMessages(safeLocale);

  if (safeLocale !== lang) {
    redirect("/" + safeLocale);
  }

  return (
    <div className="locale-root" lang={safeLocale} dir={messages.dir} data-locale={safeLocale}>
      <SplashScreen />
      <ParticleCanvas />
      <SoftRevealController />
      {children}
      <InstallAppHint messages={messages} />
      <MobileBottomNav locale={safeLocale} messages={messages} locales={messages.locales} />
    </div>
  );
}
