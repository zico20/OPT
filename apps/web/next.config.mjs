const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin"
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site"
  }
];

const nextConfig = {
  experimental: {
    externalDir: true
  },
  // Keep these outside the server bundle so Next.js dev doesn't choke
  // generating vendor chunks for them on the server.
  // - leaflet/react-leaflet: touch `window` at import time
  // - @supabase/supabase-js: hot-reload churn breaks the vendor chunk
  // - react-spring-bottom-sheet: client-only, depends on react-spring
  serverExternalPackages: [
    "leaflet",
    "react-leaflet",
    "@supabase/supabase-js"
  ],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;