// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CCNY Resource Agent (Beta)",
  description: "Helps immigrant students at CCNY find in-state tuition paths, NYS Dream Act/TAP, and scholarships.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const banner = process.env.NEXT_PUBLIC_BETA_BANNER ?? "🚧 Under development: Auth coming soon. Please try the CCNY beta and share feedback!";
  return (
    <html lang="en">
      <body className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
        <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm py-2 text-center px-3">
          {banner}
        </div>
        {children}
      </body>
    </html>
  );
}
