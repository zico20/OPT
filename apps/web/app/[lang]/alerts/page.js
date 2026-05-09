import DesktopShellV3 from "../../../components/DesktopShellV3";
import DesktopAlertsV3 from "../../../components/DesktopAlertsV3";
import MobileAlertsContent from "../../../components/MobileAlertsContent";
import { getAlertEvents, getLatestRun } from "../../../lib/data";
import { getMessages, normalizeLocale } from "../../../lib/i18n";
import { getTelegramSubscribeUrl } from "../../../lib/publicLinks";

export default async function AlertsPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);

  const [latestRun, alerts] = await Promise.all([
    getLatestRun(),
    getAlertEvents()
  ]);

  const rows = alerts.slice(0, 40);

  return (
    <div className="shell" suppressHydrationWarning>
      <div className="m-route-mobile-only">
        <MobileAlertsContent
          locale={locale}
          messages={messages}
          alerts={rows}
          runDate={latestRun?.run_date || "-"}
        />
      </div>

      <div className="m-route-desktop-only">
        <DesktopShellV3
          telegramUrl={getTelegramSubscribeUrl()}
          locale={locale}
          messages={messages}
          currentPath="/alerts"
          pageTitle={messages.alerts.title}
          pageSub={messages.alerts.intro}
          runDate={latestRun?.run_date || "-"}
          modelName={latestRun?.selected_model || "RandomForest"}
          criticalAlertCount={rows.filter((a) => a.severity === "Critical").length}
        >
          <DesktopAlertsV3
            locale={locale}
            messages={messages}
            alerts={rows}
          />
        </DesktopShellV3>
      </div>
    </div>
  );
}
