export default function manifest() {
  return {
    name: "HazardSignal",
    short_name: "HazardSignal",
    description: "Operational wildfire signals for Antalya with a mobile-first operational view.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FBF8F3",
    theme_color: "#FBF8F3",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
