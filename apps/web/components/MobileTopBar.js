const SCALE_CELLS = [
  { key: "very-low", color: "#4575b4" },
  { key: "low", color: "#91bfdb" },
  { key: "medium", color: "#ffffbf" },
  { key: "high", color: "#fdae61" },
  { key: "very-high", color: "#d73027" },
  { key: "fire", color: "#ff3131" }
];

const TITLES = {
  en: { live: "Live", about: "About", more: "Settings", methodology: "Methodology" },
  ar: { live: "مباشر", about: "حول", more: "الإعدادات", methodology: "المنهجية" },
  tr: { live: "Canlı", about: "Hakkında", more: "Ayarlar", methodology: "Metodoloji" }
};

export default function MobileTopBar({
  tab = "live",
  locale = "en",
  runDate = "-",
  showScale = true,
  rightSlot = null
}) {
  const titles = TITLES[locale] || TITLES.en;
  const title = titles[tab] || "";

  return (
    <header className="m-topbar" data-tab={tab}>
      <div className="m-topbar-row">
        <div className="m-topbar-brand" aria-label="HazardSignal">
          <svg viewBox="0 0 512 512" width="22" height="22" aria-hidden="true">
            <path d="M150 220C150 140 210 100 256 100C302 100 362 140 362 220" stroke="#FF5F1F" strokeWidth="35" strokeLinecap="round" fill="none"/>
            <path d="M190 270C190 230 225 210 256 210C287 210 322 230 322 270V310C322 350 287 380 256 380C225 380 190 350 190 310" stroke="#FF5F1F" strokeWidth="30" strokeLinecap="round" fill="none"/>
            <path d="M256 270L280 320C280 320 256 345 256 345C256 345 232 320 232 320L256 270Z" fill="#FF3131"/>
          </svg>
          <span className="m-topbar-title">{title}</span>
        </div>

        {rightSlot ? <div className="m-topbar-right">{rightSlot}</div> : (
          <div className="m-topbar-meta">
            <span className="m-topbar-date">{runDate}</span>
          </div>
        )}
      </div>

      {showScale && (
        <div className="m-topbar-scale" role="list" aria-label="Risk scale">
          {SCALE_CELLS.map((cell) => (
            <span
              key={cell.key}
              className="m-topbar-scale-cell"
              style={{ backgroundColor: cell.color }}
              role="listitem"
              title={cell.key}
            />
          ))}
        </div>
      )}
    </header>
  );
}
