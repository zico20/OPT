import MapSkeleton from "../../components/MapSkeleton";

export default function Loading() {
  return (
    <div className="shell loading-shell">
      <section className="masthead loading-masthead">
        <div className="loading-stack">
          <span className="skeleton-pill short" />
          <span className="skeleton-line title" />
          <span className="skeleton-line" />
          <span className="skeleton-line medium" />
        </div>
        <div className="hero-stats compact-stats loading-stats">
          <div className="stat-card stat-card-compact skeleton-card" />
          <div className="stat-card stat-card-compact skeleton-card" />
          <div className="stat-card stat-card-compact skeleton-card" />
          <div className="stat-card stat-card-compact skeleton-card" />
        </div>
      </section>

      <section className="section-grid" style={{ marginTop: 18 }}>
        <article className="panel" style={{ gridColumn: "span 8" }}>
          <MapSkeleton />
        </article>
        <aside className="panel snapshot-panel loading-panel" style={{ gridColumn: "span 4" }}>
          <div className="snapshot-grid">
            <div className="snapshot-tile skeleton-card" />
            <div className="snapshot-tile skeleton-card" />
            <div className="snapshot-tile skeleton-card" />
            <div className="snapshot-tile skeleton-card" />
          </div>
        </aside>
      </section>
    </div>
  );
}

