export default function MapSkeleton() {
  return (
    <div className="map-shell map-skeleton">
      <div className="map-skeleton-top">
        <span className="skeleton-pill" />
        <span className="skeleton-pill short" />
      </div>
      <div className="map-skeleton-grid">
        <span className="skeleton-dot one" />
        <span className="skeleton-dot two" />
        <span className="skeleton-dot three" />
        <span className="skeleton-dot four" />
      </div>
      <div className="map-skeleton-legend">
        <span className="skeleton-line short" />
        <span className="skeleton-line" />
        <span className="skeleton-line" />
        <span className="skeleton-line" />
      </div>
    </div>
  );
}

