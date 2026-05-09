import MobileTopBar from "./MobileTopBar";
import MobileBgParticles from "./MobileBgParticles";
import DesktopMethodV3 from "./DesktopMethodV3";

// Mobile reuses the full V3 methodology body — DesktopMethodV3 already collapses
// to a single column below 1200px (the satellite orbits aside is hidden via
// CSS), so we just wrap it in the mobile shell and let the responsive rules
// handle the rest. A few mobile-only overrides live in globals.css under
// `.m-method-page` to tighten padding and font scale for small screens.
export default function MobileMethodologyContent({
  locale = "en",
  runDate = "-",
  latestRun = null,
  rules = null
}) {
  return (
    <div className="m-method-page" data-page="methodology">
      <MobileBgParticles />
      <MobileTopBar tab="methodology" locale={locale} runDate={runDate} showScale={false} />

      <div className="m-method-page-scroll">
        <DesktopMethodV3 locale={locale} latestRun={latestRun} rules={rules} />
      </div>
    </div>
  );
}
