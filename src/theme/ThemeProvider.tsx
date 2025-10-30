"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Mode = "light" | "dark" | "system";
type Ctx = {
  theme: Mode;
  resolvedTheme: "light" | "dark";
  setTheme: (m: Mode) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function resolveSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Mode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Mode) || "system";
  });

  const resolvedTheme = theme === "system" ? resolveSystem() : theme;

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";
    root.classList.toggle("dark", isDark);
    root.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const rt = resolveSystem();
        const root = document.documentElement;
        root.classList.toggle("dark", rt === "dark");
        root.setAttribute("data-theme", rt);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const value = useMemo<Ctx>(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(){
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
