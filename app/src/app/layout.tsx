import type { Metadata, Viewport } from "next";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PWARegister } from "@/components/pwa/pwa-register";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const appName = "Polibeli Omnichannel Dashboard";
const appDescription =
  "Professional BI-grade dashboard for GT, MT, Shopee, and TikTok Shop sales analytics with real-time data processing and AI insights.";
const isDevelopment = process.env.NODE_ENV !== "production";
const developmentPwaCleanupScript = `
(() => {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => {
      if (!("caches" in window)) return [];
      return caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("polibeli-dashboard")).map((key) => caches.delete(key)))
      );
    })
    .catch(() => {});
})();
`;
const themeBootstrapScript = `
(() => {
  try {
    const theme = window.localStorage.getItem("polibeli-dashboard-theme") === "light" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  applicationName: appName,
  title: `${appName} - Omnichannel Sales Analytics`,
  description: appDescription,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Polibeli BI",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
    { media: "(prefers-color-scheme: light)", color: "#0891b2" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className="dark h-full antialiased"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {isDevelopment && <script dangerouslySetInnerHTML={{ __html: developmentPwaCleanupScript }} />}
        {!isDevelopment && <PWARegister />}
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
