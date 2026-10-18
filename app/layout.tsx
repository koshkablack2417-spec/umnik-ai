import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Умник AI — Мегамозг",
  description: "Умный AI-помощник для учёбы, идей и творчества.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brain-cap.svg", apple: "/brain-cap.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
