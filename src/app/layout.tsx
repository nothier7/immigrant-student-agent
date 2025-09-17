// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "CCNY Resource Agent (Beta)",
  description: "Helps immigrant students at CCNY find in-state tuition paths, NYS Dream Act/TAP, and scholarships.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
