"use client";

import { useTheme } from "@/theme/ThemeProvider";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ subtle = true }: { subtle?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={
        subtle
          ? "inline-flex items-center justify-center rounded-full p-2 hover:bg-card transition"
          : "inline-flex items-center justify-center rounded-2xl bg-card p-2 hover:opacity-90"
      }
      title={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
