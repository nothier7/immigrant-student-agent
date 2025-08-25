"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-950/50 border-b border-black/5 dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
              <Sparkles className="h-4 w-4" />
            </span>
            Dreamers Agent
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-300">
            <a className="hover:text-neutral-900 dark:hover:text-white transition" href="/#features">Features</a>
            <a className="hover:text-neutral-900 dark:hover:text-white transition" href="/#how">How it works</a>
            <a className="hover:text-neutral-900 dark:hover:text-white transition" href="/ccny">Try it now</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a href="#cta" className="inline-flex items-center rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5">
              Log in
            </a>
            <a href="#cta" className="inline-flex items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-semibold">
              Get started
            </a>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10"
          >
            <span className="sr-only">Toggle menu</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-current">
              <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4">
            <div className="grid gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <a className="rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5" href="#features">Features</a>
              <a className="rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5" href="#how">How it works</a>
              <a className="rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5" href="#cta">Pricing</a>
              <div className="mt-2 flex gap-2">
                <a href="#cta" className="flex-1 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium">Log in</a>
                <a href="#cta" className="flex-1 inline-flex items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-semibold">Get started</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
