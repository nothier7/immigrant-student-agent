"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ subtle = true }: { subtle?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  // The stored theme is only known on the client; render a stable icon until
  // mounted to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        subtle
          ? "inline-flex items-center justify-center rounded-full p-2 hover:bg-card transition"
          : "inline-flex items-center justify-center rounded-2xl bg-card p-2 hover:opacity-90"
      }
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
