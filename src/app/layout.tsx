import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme.css";
import { ThemeProvider } from "@/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "Dreamers Agent",
  description: "Hope-forward resources for immigrant & first-gen students",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-text antialiased transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
