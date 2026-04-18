export function buildTestAlertMessage({ runDate, districtName, probability, highRiskPct, hotspotCount }) {
  return [
    "Fire Risk Alert - Test",
    `Date: ${runDate}`,
    `District: ${districtName}`,
    `Max probability: ${Number(probability).toFixed(2)}`,
    `High/very-high area: ${Number(highRiskPct).toFixed(1)}%`,
    `Hotspots (24h): ${hotspotCount}`
  ].join("\n");
}

