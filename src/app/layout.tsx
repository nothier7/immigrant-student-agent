import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "@/styles/theme.css";
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from "@/theme/ThemeProvider";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Dreamers Agent",
  description: "Hope-forward resources for immigrant & first-gen students",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <body className="min-h-screen bg-bg font-[family-name:var(--font-sans)] text-text antialiased transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
