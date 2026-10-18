import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Умник AI — твой AI-пространство",
  description: "Единое пространство для общения с искусственным интеллектом.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
