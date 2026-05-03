import test from "node:test";
import assert from "node:assert/strict";
import {
  severityFromDistrict,
  shouldSendAlert,
  buildTelegramMessage,
  hasEscalated,
  buildDigestMessage,
  buildStateAwareDigest,
  buildStateAwarePush,
  highestSeverity,
  buildCriticalMessage,
  escapeHtml
} from "./alertRules.js";

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

test("hasEscalated detects new alert and severity bumps, ignores stable/de-escalation", () => {
  assert.equal(hasEscalated("Watch", null), true);
  assert.equal(hasEscalated("Critical", "Warning"), true);
  assert.equal(hasEscalated("Warning", "Watch"), true);
  assert.equal(hasEscalated("Warning", "Warning"), false);
  assert.equal(hasEscalated("Watch", "Critical"), false);
});

test("escapeHtml escapes only the three structural chars", () => {
  assert.equal(escapeHtml("a < b & c > d"), "a &lt; b &amp; c &gt; d");
  assert.equal(escapeHtml("Manavgat"), "Manavgat");
});

test("buildCriticalMessage includes district, probability and dashboard link", () => {
  const msg = buildCriticalMessage({
    runDate: "2026-04-25",
    district: { district_name: "Manavgat", max_fire_prob: 0.91, high_or_very_high_area_pct: 23.9, hotspot_count_24h: 3 },
    triggerReason: "Active hotspot and high-risk classification",
    appUrl: "https://hazardsignal.com"
  });
  assert.match(msg, /CRITICAL FIRE ALERT/);
  assert.match(msg, /Manavgat/);
  assert.match(msg, /0\.91/);
  assert.match(msg, /hazardsignal\.com/);
});

test("highestSeverity picks the strongest of a mixed list", () => {
  assert.equal(highestSeverity([{ severity: "Watch" }, { severity: "Critical" }, { severity: "Warning" }]), "Critical");
  assert.equal(highestSeverity([{ severity: "Watch" }, { severity: "Warning" }]), "Warning");
  assert.equal(highestSeverity([]), null);
});

test("buildStateAwareDigest tailors hook + button to severity", () => {
  const url = "https://hazardsignal.com";

  const calm = buildStateAwareDigest({ alerts: [], cleared: [{ district: { district_name: "Demre" } }], appUrl: url });
  assert.match(calm.text, /calm today/);
  assert.match(calm.text, /Tap to confirm/);
  assert.equal(calm.replyMarkup.inline_keyboard[0][0].text, "Open dashboard");
  assert.equal(calm.replyMarkup.inline_keyboard[0][0].url, url);

  const watch = buildStateAwareDigest({ alerts: [{ severity: "Watch" }], appUrl: url });
  assert.match(watch.text, /eyes today/);

  const warning = buildStateAwareDigest({ alerts: [{ severity: "Watch" }, { severity: "Warning" }], appUrl: url });
  assert.match(warning.text, /Warning issued/);

  const critical = buildStateAwareDigest({ alerts: [{ severity: "Warning" }, { severity: "Critical" }], appUrl: url });
  assert.match(critical.text, /Critical fire risk/);
  assert.match(critical.text, /Open immediately/);
});

test("buildStateAwareDigest omits replyMarkup when no appUrl is given", () => {
  const result = buildStateAwareDigest({ alerts: [{ severity: "Warning" }] });
  assert.equal(result.replyMarkup, undefined);
});

test("buildStateAwarePush returns title + body that mirror digest severity", () => {
  const calm = buildStateAwarePush({ alerts: [], cleared: [{ district_name: "Demre" }] });
  assert.match(calm.title, /calm today/);
  assert.match(calm.body, /Tap to confirm/);

  const watch = buildStateAwarePush({ alerts: [{ severity: "Watch" }] });
  assert.match(watch.title, /eyes today/);

  const warning = buildStateAwarePush({ alerts: [{ severity: "Watch" }, { severity: "Warning" }] });
  assert.match(warning.title, /Warning issued/);

  const critical = buildStateAwarePush({ alerts: [{ severity: "Warning" }, { severity: "Critical" }] });
  assert.match(critical.title, /Critical fire risk/);
  assert.match(critical.body, /immediately/);
});

test("buildStateAwarePush quiet-day fallback when there are no alerts and no cleared", () => {
  const empty = buildStateAwarePush({});
  assert.match(empty.title, /calm today/);
  assert.match(empty.body, /briefing/);
});

test("buildDigestMessage groups by severity and lists clearings", () => {
  const msg = buildDigestMessage({
    runDate: "2026-04-25",
    alerts: [
      { severity: "Critical", district: { district_name: "Manavgat", max_fire_prob: 0.91, hotspot_count_24h: 3 } },
      { severity: "Warning", district: { district_name: "Alanya", max_fire_prob: 0.82, hotspot_count_24h: 0 } },
      { severity: "Watch", district: { district_name: "Konyaalti", max_fire_prob: 0.6, hotspot_count_24h: 0 } }
    ],
    cleared: [{ district: { district_name: "Demre" } }],
    appUrl: "https://hazardsignal.com"
  });
  assert.match(msg, /Daily Risk Digest/);
  assert.match(msg, /Critical/);
  assert.match(msg, /Manavgat/);
  assert.match(msg, /Warning/);
  assert.match(msg, /Watch/);
  assert.match(msg, /All Clear/);
  assert.match(msg, /Demre/);
});

