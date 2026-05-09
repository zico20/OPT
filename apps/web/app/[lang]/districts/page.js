import DesktopShellV3 from "../../../components/DesktopShellV3";
import DesktopDistrictsV3 from "../../../components/DesktopDistrictsV3";
import MobileDistrictsContent from "../../../components/MobileDistrictsContent";
import {
  getActiveFireDaily,
  getAlertEvents,
  getAlertRules,
  getDistrictRiskDaily,
  getLatestRun,
  getWeatherData,
  deriveOperationalSeverity,
  sortDistrictsForOperations
} from "../../../lib/data";
import { getMessages, normalizeLocale } from "../../../lib/i18n";
import { deriveMissionState } from "../../../lib/mission";
import { getTelegramSubscribeUrl } from "../../../lib/publicLinks";

export default async function DistrictsListPage({ params }) {
  const resolvedParams = await params;
  const locale = normalizeLocale(resolvedParams.lang);
  const messages = getMessages(locale);

  const [latestRun, districtRows, fires, alerts, rules, weather] = await Promise.all([
    getLatestRun(),
    getDistrictRiskDaily(),
    getActiveFireDaily(),
    getAlertEvents(),
    getAlertRules(),
    getWeatherData()
  ]);

  const districts = sortDistrictsForOperations(districtRows, rules).map((d) => ({
    ...d,
    operational_severity: deriveOperationalSeverity(d, rules)
  }));

  const missionState = deriveMissionState({ latestRun, districts, fires, alerts });
  const criticalDistricts = latestRun?.critical_districts ?? 0;
  const activeFireDistricts = latestRun?.active_fire_districts ?? 0;
  const peakProbability = districts.reduce((m, d) => Math.max(m, d.max_fire_prob ?? 0), 0);
  const runDate = latestRun?.run_date || "-";

  return (
    <div className="shell" suppressHydrationWarning>
      <div className="m-route-mobile-only">
        <MobileDistrictsContent
          locale={locale}
          messages={messages}
          districts={districts}
          runDate={runDate}
        />
      </div>

      <div className="m-route-desktop-only">
        <DesktopShellV3
          telegramUrl={getTelegramSubscribeUrl()}
          locale={locale}
          messages={messages}
          currentPath="/districts"
          pageTitle={messages.nav?.districts || "Districts"}
          pageSub={messages.home?.intro}
          runDate={runDate}
          modelName={latestRun?.selected_model || "RandomForest"}
          criticalAlertCount={alerts.filter((a) => a.severity === "Critical").length}
        >
          <DesktopDistrictsV3 locale={locale} messages={messages} districts={districts} />
        </DesktopShellV3>
      </div>
    </div>
  );
}
