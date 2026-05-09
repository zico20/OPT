import MobileMethodologyContent from "../../../components/MobileMethodologyContent";
import DesktopShellV3 from "../../../components/DesktopShellV3";
import DesktopMethodV3 from "../../../components/DesktopMethodV3";
import { getAlertEvents, getAlertRules, getLatestRun } from "../../../lib/data";
import { getMessages, normalizeLocale } from "../../../lib/i18n";
import { getTelegramSubscribeUrl } from "../../../lib/publicLinks";

export default async function MethodologyPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);

  const [latestRun, alerts, rules] = await Promise.all([
    getLatestRun(),
    getAlertEvents(),
    getAlertRules()
  ]);

  return (
    <div className="shell" suppressHydrationWarning>
      <div className="m-route-mobile-only">
        <MobileMethodologyContent
          locale={locale}
          messages={messages}
          runDate={latestRun?.run_date || "-"}
          latestRun={latestRun}
          rules={rules}
        />
      </div>

      <div className="m-route-desktop-only">
        <DesktopShellV3
          telegramUrl={getTelegramSubscribeUrl()}
          locale={locale}
          messages={messages}
          currentPath="/methodology"
          pageTitle={messages.methodology?.title || "Methodology"}
          pageSub={messages.methodology?.eyebrow || ""}
          runDate={latestRun?.run_date || "-"}
          modelName={latestRun?.selected_model || "RandomForest"}
          criticalAlertCount={alerts.filter((a) => a.severity === "Critical").length}
          dimBg
        >
          <DesktopMethodV3 locale={locale} latestRun={latestRun} rules={rules} />
        </DesktopShellV3>
      </div>
    </div>
  );
}
