"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function Header() {
  return (
    <header className="glass-surface sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-heading">
          Dreamers Agent
        </Link>

        <nav className="flex items-center gap-3">
          {/* subtle dark-mode toggle (sun/moon only) */}
          <ThemeToggle subtle />
        </nav>
      </div>
    </header>
  );
}
