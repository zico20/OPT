export default function DistrictHistoryChart({ history, warningThreshold = 0.7 }) {
  if (!history || history.length < 2) return null;

  const sorted = [...history]
    .sort((a, b) => String(a.run_date).localeCompare(String(b.run_date)))
    .slice(-30);

  const values = sorted.map((r) => Math.min(1, Math.max(0, Number(r.max_fire_prob || 0))));
  const n = values.length;

  const W = 600;
  const H = 100;
  const PX = 12;
  const PY = 10;

  const xOf = (i) => PX + (i / (n - 1)) * (W - PX * 2);
  const yOf = (v) => H - PY - v * (H - PY * 2);

  const linePts = values.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
  const fillPts = `${xOf(0).toFixed(1)},${(H - PY).toFixed(1)} ${linePts} ${xOf(n - 1).toFixed(1)},${(H - PY).toFixed(1)}`;

  const thresholdY = yOf(warningThreshold).toFixed(1);

  return (
    <div className="history-chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="history-chart"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b2b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ff6b2b" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={PX} y1={thresholdY}
          x2={W - PX} y2={thresholdY}
          stroke="#ef4444" strokeWidth="1" strokeDasharray="5,4" opacity="0.5"
        />

        <polygon points={fillPts} fill="url(#hc-fill)" />
        <polyline
          points={linePts}
          fill="none"
          stroke="#ff6b2b"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {values.map((v, i) =>
          v >= warningThreshold ? (
            <circle
              key={i}
              cx={xOf(i).toFixed(1)}
              cy={yOf(v).toFixed(1)}
              r="4"
              fill="#ef4444"
            />
          ) : null
        )}
      </svg>

      <div className="history-chart-legend">
        <span className="history-chart-legend-line" />
        <span>Max fire probability</span>
        <span className="history-chart-legend-threshold" />
        <span>Warning threshold ({Math.round(warningThreshold * 100)}%)</span>
      </div>
    </div>
  );
}
