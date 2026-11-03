import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FINN | Evidence before interpretation",
  description: "A rules-based portfolio inbox and evidence-backed company research workspace. Historical prototype; no model calls.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
