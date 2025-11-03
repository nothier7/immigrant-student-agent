"use client";

import React from "react";
import ResourceReport from "@/app/components/ResourceReport";

export type Scope = "school" | "cuny" | "national";
export type ResourceKind = "scholarship" | "mentorship" | "resource";

export type ResourceItem = {
  id: string;
  kind: ResourceKind;
  name: string;
  url?: string | null;
  description?: string | null;
  category?: string | null;
  authority?: string | null;
  deadline?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  schools: string[];
  created_at: string; // ISO
  scope: Scope;
};

function formatAmount(min?: number | null, max?: number | null) {
  if (min == null && max == null) return undefined;
  const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return fmt(max as number);
}

export default function ResourceCard({ item }: { item: ResourceItem }) {
  const amt = formatAmount(item.amount_min ?? undefined, item.amount_max ?? undefined);
  const campusCode = (item.scope === "school"
    ? (item.schools || []).find((s) => !["all", "all-cuny", "cuny", "usa", "national"].includes(String(s).toLowerCase()))
    : undefined) as string | undefined;
  return (
    <div className="group block rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wide text-text/60">
          {item.authority || item.category || item.kind}
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-1.5 py-0.5 text-[10px] uppercase">
            {item.kind}
          </span>
          <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-1.5 py-0.5 text-[10px] uppercase">
            {item.scope}
          </span>
          {campusCode && (
            <span className="inline-flex items-center rounded-full border border-[color:rgb(var(--glass-border)/0.18)] px-1.5 py-0.5 text-[10px] uppercase">
              {campusCode}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-heading">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {item.name}
          </a>
        ) : (
          item.name
        )}
      </div>
      {item.description && (
        <p className="mt-1 line-clamp-3 text-sm text-text/85">{item.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text/70">
        {item.deadline && (
          <span className="inline-flex items-center gap-1">Deadline: {item.deadline}</span>
        )}
        {amt && <span className="inline-flex items-center gap-1">Amount: {amt}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="text-text/60">
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Open link
            </a>
          )}
        </div>
        <ResourceReport kind={item.kind} id={item.id} />
      </div>
    </div>
  );
}
