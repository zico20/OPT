export default function Loading() {
  return (
    <div className="route-loader" role="status" aria-live="polite" aria-label="Loading">
      <div className="route-loader-glow" aria-hidden="true" />
      <div className="route-loader-content">
        <div className="route-loader-mark" aria-hidden="true">
          <svg viewBox="0 0 512 512" width="56" height="56">
            <path
              d="M150 220C150 140 210 100 256 100C302 100 362 140 362 220"
              stroke="#FF5F1F"
              strokeWidth="35"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M190 270C190 230 225 210 256 210C287 210 322 230 322 270V310C322 350 287 380 256 380C225 380 190 350 190 310"
              stroke="#FF5F1F"
              strokeWidth="30"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M256 270L280 320C280 320 256 345 256 345C256 345 232 320 232 320L256 270Z"
              fill="#FF3131"
            />
          </svg>
          <span className="route-loader-ring" />
        </div>
        <span className="route-loader-label">HazardSignal</span>
        <span className="route-loader-sub">Loading…</span>
      </div>
    </div>
  );
}
