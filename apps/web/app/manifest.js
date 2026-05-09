export default function manifest() {
  return {
    name: "HazardSignal",
    short_name: "HazardSignal",
    description: "Operational wildfire signals for Antalya with a mobile-first operational view.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      // Brand radar logo as SVG — scales to any DPI, single source of truth.
      // The PNGs in /public are the legacy curved logo; left in place but no
      // longer referenced from the manifest. Modern browsers (incl. iOS 16+)
      // accept SVG icons in PWA manifests; older Safari falls back to the
      // <link rel="apple-touch-icon"> Next.js auto-generates from
      // /app/apple-icon.svg.
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
