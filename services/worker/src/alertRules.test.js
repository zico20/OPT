import test from "node:test";
import assert from "node:assert/strict";
import { severityFromDistrict, shouldSendAlert, buildTelegramMessage } from "./alertRules.js";

const rules = {
  probability_watch_min: 0.55,
  probability_warning_min: 0.7,
  high_or_very_high_area_pct_min: 10,
  hotspot_count_critical_min: 1
};

test("classifies critical alert when hotspot and high-risk are both present", () => {
  const severity = severityFromDistrict({
    max_fire_prob: 0.9,
    high_or_very_high_area_pct: 25,
    hotspot_count_24h: 2
  }, rules);

  assert.equal(severity, "Critical");
});

test("returns no alert when district remains below watch thresholds", () => {
  const alert = shouldSendAlert({
    max_fire_prob: 0.41,
    high_or_very_high_area_pct: 2,
    hotspot_count_24h: 0
  }, rules);

  assert.equal(alert, null);
});

test("builds telegram message with essential context", () => {
  const message = buildTelegramMessage({
    runDate: "2026-03-10",
    district: {
      district_name: "Manavgat",
      max_fire_prob: 0.91,
      high_or_very_high_area_pct: 23.9,
      hotspot_count_24h: 2
    },
    appUrl: "https://example.com",
    severity: "Critical",
    triggerReason: "Active hotspot and high-risk classification"
  });

  assert.match(message, /Manavgat/);
  assert.match(message, /0.91/);
  assert.match(message, /https:\/\/example.com/);
});

