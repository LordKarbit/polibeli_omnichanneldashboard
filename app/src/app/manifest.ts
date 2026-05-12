import type { MetadataRoute } from "next";

const appName = "Polibeli Omnichannel Dashboard";
const description =
  "Management-grade omnichannel sales analytics for GT, MT, Shopee, TikTok Shop, geo sales, retention, and AI insights.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: appName,
    short_name: "Polibeli BI",
    description,
    lang: "id-ID",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#020617",
    theme_color: "#0891b2",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Executive Overview",
        short_name: "Overview",
        description: "Open the management summary dashboard.",
        url: "/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "GT Performance",
        short_name: "GT",
        description: "Open Regional Manager and GT sales performance.",
        url: "/gt",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Geo Sales",
        short_name: "Geo",
        description: "Open Indonesia GMV boundary map.",
        url: "/geo",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Marketplace",
        short_name: "Market",
        description: "Open marketplace sales, released amount, and settlement reporting.",
        url: "/marketplace",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Upload Center",
        short_name: "Upload",
        description: "Upload and process raw sales files.",
        url: "/upload",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
