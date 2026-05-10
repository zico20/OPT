import { redirect } from "next/navigation";
import InstallAppHint from "../../components/InstallAppHint";
import MobileBottomNavV2 from "../../components/MobileBottomNavV2";
import ParticleCanvas from "../../components/ParticleCanvas";
import SplashScreen from "../../components/SplashScreen";
import { getMessages, normalizeLocale } from "../../lib/i18n";

// Force every [lang] route to be server-rendered on demand. Without this,
// Next.js 15 dev tries static-path generation and crashes its worker on
// child components that use dynamic({ ssr: false }) (e.g. MobileLiveMapV3,
// DesktopLiveMapV3 — anything Leaflet-backed).
export const dynamic = "force-dynamic";

export default async function LocaleLayout({ children, params }) {
  const { lang } = await params;
  const safeLocale = normalizeLocale(lang);
  const messages = getMessages(safeLocale);

  if (safeLocale !== lang) {
    redirect("/" + safeLocale);
  }

  return (
    <div className="locale-root" lang={safeLocale} data-locale={safeLocale} suppressHydrationWarning>
      <SplashScreen />
      <ParticleCanvas />
      {children}
      <InstallAppHint messages={messages} />
      <MobileBottomNavV2 locale={safeLocale} />
    </div>
  );
}
