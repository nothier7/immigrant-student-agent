"use client";

import React, { useEffect, useMemo, useState } from "react";
import ResourceCard, { ResourceItem, ResourceKind } from "@/app/components/ResourceCard";
import { useRouter, useSearchParams } from "next/navigation";

type SortKey = "date" | "deadline";
type AddedWindow = "all" | "30d";

type School = { code: string; name: string };

function byDateDesc(a: ResourceItem, b: ResourceItem) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function parseDeadline(d?: string | null): number | null {
  if (!d) return null;
  // Attempt basic parsing; many deadlines may be text — keep them last
  const t = Date.parse(d);
  if (Number.isNaN(t)) return null;
  return t;
}

export default function ResourceDirectoryClient({ initial, schools }: { initial: ResourceItem[]; schools: School[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const [kinds, setKinds] = useState<Record<ResourceKind, boolean>>({ scholarship: true, mentorship: true, resource: true });
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [added, setAdded] = useState<AddedWindow>("all");
  const [school, setSchool] = useState<string>("all-cuny");
  const [q, setQ] = useState<string>("");

  const toggleKind = (k: ResourceKind) => setKinds((m) => ({ ...m, [k]: !m[k] }));

  // Initialize state from URL on first render
  useEffect(() => {
    if (!search) return;
    const urlSchool = (search.get("school") || "all-cuny").toLowerCase();
    setSchool(urlSchool);

    const urlSort = (search.get("sort") as SortKey) || "date";
    setSortBy(urlSort === "deadline" ? "deadline" : "date");

    const urlAdded = (search.get("added") as AddedWindow) || "all";
    setAdded(urlAdded === "30d" ? "30d" : "all");

    const kindsParam = search.get("kinds");
    if (kindsParam) {
      const enabled = new Set(kindsParam.split(",").map((s) => s.trim().toLowerCase()));
      setKinds({
        scholarship: enabled.has("scholarship"),
        mentorship: enabled.has("mentorship"),
        resource: enabled.has("resource"),
      });
    }
    const urlQ = (search.get("q") || "").trim();
    setQ(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state to URL (replace, not push) without causing loops
  useEffect(() => {
    const params = new URLSearchParams(search?.toString());
    // school
    if (school && school !== "all-cuny") params.set("school", school);
    else params.delete("school");
    // sort
    if (sortBy !== "date") params.set("sort", sortBy);
    else params.delete("sort");
    // added
    if (added !== "all") params.set("added", added);
    else params.delete("added");
    // kinds (omit when all true)
    const allKindsOn = kinds.scholarship && kinds.mentorship && kinds.resource;
    if (!allKindsOn) {
      const list: string[] = [];
      if (kinds.scholarship) list.push("scholarship");
      if (kinds.mentorship) list.push("mentorship");
      if (kinds.resource) list.push("resource");
      if (list.length) params.set("kinds", list.join(","));
      else params.delete("kinds");
    } else {
      params.delete("kinds");
    }
    // q
    if (q && q.trim().length > 0) params.set("q", q.trim());
    else params.delete("q");

    const next = params.toString();
    const curr = search?.toString() || "";
    if (next !== curr) router.replace(`?${next}`);
  }, [school, sortBy, added, kinds, q, router, search]);

  const items = useMemo(() => {
    let list = initial.filter((i) => kinds[i.kind]);
    if (school !== "all-cuny") {
      const s = school.toLowerCase();
      list = list.filter((i) => i.scope === "cuny" || (i.schools || []).map((x) => x.toLowerCase()).includes(s));
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((i) =>
        (i.name || "").toLowerCase().includes(needle) ||
        (i.description || "").toLowerCase().includes(needle) ||
        (i.authority || "").toLowerCase().includes(needle)
      );
    }
    if (added === "30d") {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      list = list.filter((i) => new Date(i.created_at).getTime() >= cutoff);
    }
    if (sortBy === "date") list = list.slice().sort(byDateDesc);
    else list = list.slice().sort((a, b) => {
      const da = parseDeadline(a.deadline);
      const db = parseDeadline(b.deadline);
      if (da == null && db == null) return 0;
      if (da == null) return 1; // nulls last
      if (db == null) return -1;
      return da - db;
    });
    return list;
  }, [initial, kinds, school, q, added, sortBy]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      {/* Controls */}
      <div className="sticky top-[52px] z-10 mb-4 rounded-2xl border border-[color:rgb(var(--glass-border)/0.12)] bg-card/80 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, description, authority…"
            className="min-w-[220px] rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-3 py-1.5 text-sm"
          />
          <div className="h-4 w-px bg-[color:rgb(var(--glass-border)/0.25)]" />
          {/* School selector (CUNY campuses) */}
          <label className="text-xs text-text/70">School</label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-2 py-1 text-xs"
          >
            <option value="all-cuny">All CUNY</option>
            {schools.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Kind filters */}
          {(["scholarship", "mentorship", "resource"] as ResourceKind[]).map((k) => (
            <button
              key={k}
              onClick={() => toggleKind(k)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${
                kinds[k]
                  ? "border-[color:rgb(var(--primary))] bg-[color:rgb(var(--primary)/0.08)] text-heading"
                  : "border-[color:rgb(var(--glass-border)/0.22)] text-text/80 hover:bg-[color:rgb(var(--card)/0.8)]"
              }`}
            >
              {k}
            </button>
          ))}

          <div className="flex-1" />
          {/* Quick submit link */}
          <a
            href={`/schools/${encodeURIComponent(school === 'all-cuny' ? 'ccny' : school)}/submit`}
            className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] px-3 py-1 text-xs hover:bg-[color:rgb(var(--card)/0.8)]"
          >
            Submit a resource
          </a>

          {/* Added time window */}
          <label className="text-xs text-text/70">Added</label>
          <select
            value={added}
            onChange={(e) => setAdded(e.target.value as AddedWindow)}
            className="rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-2 py-1 text-xs"
          >
            <option value="all">All time</option>
            <option value="30d">Last 30 days</option>
          </select>

          {/* Sort */}
          <label className="text-xs text-text/70">Sort</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card px-2 py-1 text-xs"
          >
            <option value="date">Date added</option>
            <option value="deadline">Soonest deadline</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      {items.length === 0 ? (
        <p className="px-1 text-sm text-text/70">No results. Try adjusting filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ResourceCard key={`${it.kind}-${it.id}`} item={it} />
          ))}
        </div>
      )}
    </section>
  );
}
