import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptShield | Consensus prompt security",
  description: "Classify prompt-injection and data-exfiltration risk with a canonical GenLayer consensus result.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a08",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
