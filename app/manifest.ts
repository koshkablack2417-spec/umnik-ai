import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Умник AI — Мегамозг",
    short_name: "Умник AI",
    description: "Твой AI-помощник для идей, учёбы и творчества.",
    start_url: "/",
    display: "standalone",
    background_color: "#090b10",
    theme_color: "#090b10",
    icons: [{ src: "/brain-cap.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  };
}
