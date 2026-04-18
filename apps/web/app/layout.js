import "leaflet/dist/leaflet.css";
import "./globals.css";
import { IBM_Plex_Sans, Noto_Sans_Arabic, Sora } from "next/font/google";

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"]
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const rtlFont = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-body-rtl",
  weight: ["400", "500", "600", "700"]
});

export const metadata = {
  title: "HazardSignal",
  description: "Operational hazard monitoring dashboard, district summaries, and alert administration.",
  applicationName: "HazardSignal",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${rtlFont.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
