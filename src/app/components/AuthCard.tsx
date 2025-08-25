"use client";
import { useState } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <div className="mx-auto mt-12 w-full rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      <p className="mt-6 text-xs text-neutral-600 dark:text-neutral-400">By continuing you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy</a>.</p>
    </div>
  );
}