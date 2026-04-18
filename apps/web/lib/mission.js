export const MISSION_SEQUENCE = ["monitoring", "escalation", "incident"];

export function deriveMissionState({ latestRun = null, districts = [], fires = [], alerts = [], district = null } = {}) {
  const criticalDistricts = Number(latestRun?.critical_districts ?? 0);
  const warningDistricts = Number(latestRun?.warning_districts ?? 0);
  const activeFireDistricts = Number(latestRun?.active_fire_districts ?? 0);
  const hotspotCount = district ? Number(district.hotspot_count_24h ?? 0) : fires.length;
  const criticalAlerts = alerts.filter((item) => item?.severity === "Critical").length;
  const warningAlerts = alerts.filter((item) => item?.severity === "Warning").length;

  const highestProbability = Math.max(
    Number(district?.max_fire_prob ?? 0),
    ...districts.map((item) => Number(item?.max_fire_prob ?? 0)),
    ...alerts.map((item) => Number(item?.max_fire_prob ?? 0)),
    Number(latestRun?.selected_threshold ?? 0)
  );

  if (activeFireDistricts > 0 || hotspotCount >= 2 || criticalAlerts > 0) {
    return "incident";
  }

  if (criticalDistricts > 0 || warningDistricts > 0 || warningAlerts > 0 || highestProbability >= 0.65) {
    return "escalation";
  }

  return "monitoring";
}

