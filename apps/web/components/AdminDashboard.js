"use client";

import { useState } from "react";

const defaultSubscriber = {
  channel_type: "telegram",
  chat_id: "",
  district_scope: "all"
};

const fallback = {
  sendTestTitle: "Send test alert",
  sendTestBody: "Use this to send a real Telegram test alert to the configured default chat.",
  sendTestBtn: "Send live Telegram test alert",
  addSubTitle: "Add subscriber",
  channel: "Channel type",
  chatId: "Chat ID",
  scope: "District scope",
  scopePlaceholder: "all or district id",
  addSubBtn: "Add subscriber",
  rulesTitle: "Alert rules",
  watchMin: "Watch probability minimum",
  warningMin: "Warning probability minimum",
  areaMin: "High-risk area minimum (%)",
  hotMin: "Critical hotspot minimum",
  updateBtn: "Update rules"
};

function label(labels, key) {
  return labels?.[key] || fallback[key];
}

export default function AdminDashboard({ initialRules, initialSubscribers, labels, locale = "en" }) {
  const [rules, setRules] = useState(initialRules);
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [testResponse, setTestResponse] = useState(null);
  const [subscriberForm, setSubscriberForm] = useState(defaultSubscriber);
  const [rulesForm, setRulesForm] = useState({
    probability_watch_min: initialRules.probability_watch_min,
    probability_warning_min: initialRules.probability_warning_min,
    high_or_very_high_area_pct_min: initialRules.high_or_very_high_area_pct_min,
    hotspot_count_critical_min: initialRules.hotspot_count_critical_min
  });

  async function handleTestAlert(event) {
    event.preventDefault();

    const response = await fetch("/api/admin/alerts/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        districtId: "manavgat"
      })
    });

    const data = await response.json();
    setTestResponse(data);
  }

  async function handleAddSubscriber(event) {
    event.preventDefault();

    const response = await fetch("/api/admin/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(subscriberForm)
    });

    const data = await response.json();
    setSubscribers((current) => [data.subscriber, ...current]);
    setSubscriberForm(defaultSubscriber);
  }

  async function handleUpdateRules(event) {
    event.preventDefault();

    const response = await fetch("/api/admin/alert-rules", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(rulesForm)
    });

    const data = await response.json();
    setRules(data.rules);
  }

  return (
    <div className={`admin-grid ${locale === "ar" ? "rtl" : ""}`}>
      <section className="panel admin-panel admin-panel-dark">
        <span className="eyebrow">{labels.signalTest || "Signal Test"}</span>
        <h2>{label(labels, "sendTestTitle")}</h2>
        <p>{label(labels, "sendTestBody")}</p>
        <form onSubmit={handleTestAlert}>
          <button type="submit">{label(labels, "sendTestBtn")}</button>
        </form>
        {testResponse ? (
          <pre className="response-box compact">{JSON.stringify(testResponse, null, 2)}</pre>
        ) : null}
      </section>

      <section className="panel admin-panel">
        <span className="eyebrow">{labels.subscribersLabel || "Subscribers"}</span>
        <h2>{label(labels, "addSubTitle")}</h2>
        <form onSubmit={handleAddSubscriber}>
          <label>
            {label(labels, "channel")}
            <select
              value={subscriberForm.channel_type}
              onChange={(event) => setSubscriberForm((current) => ({
                ...current,
                channel_type: event.target.value
              }))}
            >
              <option value="telegram">Telegram</option>
            </select>
          </label>
          <label>
            {label(labels, "chatId")}
            <input
              value={subscriberForm.chat_id}
              onChange={(event) => setSubscriberForm((current) => ({
                ...current,
                chat_id: event.target.value
              }))}
              placeholder="-100123456789"
            />
          </label>
          <label>
            {label(labels, "scope")}
            <input
              value={subscriberForm.district_scope}
              onChange={(event) => setSubscriberForm((current) => ({
                ...current,
                district_scope: event.target.value
              }))}
              placeholder={label(labels, "scopePlaceholder")}
            />
          </label>
          <button type="submit">{label(labels, "addSubBtn")}</button>
        </form>
        <div className="admin-subject-bar">
          <span className="pill">{labels.total || "Total"}: {subscribers.length}</span>
          <span className="pill">{labels.enabled || "Enabled"}: {subscribers.filter((item) => item.enabled).length}</span>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table admin-ops-table">
            <thead>
              <tr>
                <th>{label(labels, "channel")}</th>
                <th>{label(labels, "scope")}</th>
                <th>{label(labels, "chatId")}</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.subscriber_id}>
                  <td>
                    <span className="badge watch">{subscriber.channel_type}</span>
                  </td>
                  <td>
                    <div className="ops-row-title">{subscriber.district_scope}</div>
                    <div className="ops-row-sub">{subscriber.subscriber_id}</div>
                  </td>
                  <td>
                    <span className="ops-timestamp">{subscriber.chat_id}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel admin-panel">
        <span className="eyebrow">{labels.ruleEngine || "Rule Engine"}</span>
        <h2>{label(labels, "rulesTitle")}</h2>
        <div className="admin-rule-grid">
          <div className="admin-rule-card">
            <span className="stat-label">{label(labels, "watchMin")}</span>
            <strong className="admin-rule-value">{rules.probability_watch_min}</strong>
          </div>
          <div className="admin-rule-card">
            <span className="stat-label">{label(labels, "warningMin")}</span>
            <strong className="admin-rule-value">{rules.probability_warning_min}</strong>
          </div>
          <div className="admin-rule-card">
            <span className="stat-label">{label(labels, "areaMin")}</span>
            <strong className="admin-rule-value">{rules.high_or_very_high_area_pct_min}</strong>
          </div>
          <div className="admin-rule-card">
            <span className="stat-label">{label(labels, "hotMin")}</span>
            <strong className="admin-rule-value">{rules.hotspot_count_critical_min}</strong>
          </div>
        </div>
        <form onSubmit={handleUpdateRules}>
          <label>
            {label(labels, "watchMin")}
            <input
              type="number"
              step="0.01"
              value={rulesForm.probability_watch_min}
              onChange={(event) => setRulesForm((current) => ({
                ...current,
                probability_watch_min: Number(event.target.value)
              }))}
            />
          </label>
          <label>
            {label(labels, "warningMin")}
            <input
              type="number"
              step="0.01"
              value={rulesForm.probability_warning_min}
              onChange={(event) => setRulesForm((current) => ({
                ...current,
                probability_warning_min: Number(event.target.value)
              }))}
            />
          </label>
          <label>
            {label(labels, "areaMin")}
            <input
              type="number"
              step="0.1"
              value={rulesForm.high_or_very_high_area_pct_min}
              onChange={(event) => setRulesForm((current) => ({
                ...current,
                high_or_very_high_area_pct_min: Number(event.target.value)
              }))}
            />
          </label>
          <label>
            {label(labels, "hotMin")}
            <input
              type="number"
              step="1"
              value={rulesForm.hotspot_count_critical_min}
              onChange={(event) => setRulesForm((current) => ({
                ...current,
                hotspot_count_critical_min: Number(event.target.value)
              }))}
            />
          </label>
          <button type="submit">{label(labels, "updateBtn")}</button>
        </form>
        <pre className="response-box compact">{JSON.stringify(rules, null, 2)}</pre>
      </section>
    </div>
  );
}
