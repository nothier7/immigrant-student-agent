"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  Database,
  ExternalLink,
  Filter,
  KeyRound,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

type Source = "resource_bank" | "resources" | "scholarships" | "mentorships";
type HealthStatus =
  | "pending"
  | "verified"
  | "stale"
  | "unverifiable"
  | "broken"
  | "restricted"
  | "unknown";

type AdminResourceRow = {
  id: string;
  source: Source;
  kind: "ai-bank" | "resource" | "scholarship" | "mentorship";
  name: string;
  url: string | null;
  description: string | null;
  authority: string | null;
  status: string;
  healthStatus: HealthStatus;
  addedBy: string | null;
  runKey: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  reason: string | null;
  tags: string[];
  sourceTier: number | null;
  linkStatus: string | null;
  linkFailCount: number | null;
  linkHttpStatus: number | null;
};

type AdminSummary = {
  total: number;
  aiBank: number;
  manualReview: number;
  staleOrBroken: number;
  verified: number;
  pendingDirectory: number;
  lastRun: string | null;
};

type ApiResponse = {
  ok: boolean;
  generatedAt: string;
  summary: AdminSummary;
  total: number;
  rows: AdminResourceRow[];
  error?: string;
};

type TabId =
  | "overview"
  | "ai-bank"
  | "discovery"
  | "verification"
  | "directory"
  | "manual-review"
  | "logs";

const KEY_STORAGE = "admin_key";

const TABS: { id: TabId; label: string; tone?: "violet" | "green" | "amber" }[] = [
  { id: "overview", label: "Overview" },
  { id: "ai-bank", label: "AI Bank" },
  { id: "discovery", label: "Discovery Runs", tone: "violet" },
  { id: "verification", label: "Verification", tone: "green" },
  { id: "directory", label: "Directory Links" },
  { id: "manual-review", label: "Manual Review", tone: "amber" },
  { id: "logs", label: "Logs" },
];

const SOURCE_LABELS: Record<Source, string> = {
  resource_bank: "AI bank",
  resources: "Resources",
  scholarships: "Scholarships",
  mentorships: "Mentorships",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending / unchecked" },
  { value: "pending_review", label: "Needs manual review" },
  { value: "verified", label: "Verified / healthy" },
  { value: "stale", label: "Stale" },
  { value: "broken", label: "Broken" },
  { value: "unverifiable", label: "Unverifiable" },
  { value: "active", label: "Public active" },
  { value: "archived", label: "Public archived" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function relativeTime(value?: string | null) {
  if (!value) return "never";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "unknown";
  const diff = Date.now() - time;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not checked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function matchesTab(row: AdminResourceRow, tab: TabId) {
  if (tab === "overview") {
    return (
      row.status === "pending_review" ||
      row.healthStatus === "stale" ||
      row.healthStatus === "broken" ||
      row.healthStatus === "unverifiable" ||
      (row.source !== "resource_bank" && row.healthStatus === "pending") ||
      !row.url
    );
  }
  if (tab === "ai-bank") return row.source === "resource_bank";
  if (tab === "discovery") return row.source === "resource_bank" && row.addedBy === "discovery";
  if (tab === "verification") return row.source === "resource_bank" && Boolean(row.lastCheckedAt);
  if (tab === "directory") return row.source !== "resource_bank";
  if (tab === "manual-review") {
    return row.status === "pending_review" || row.healthStatus === "broken" || row.healthStatus === "unverifiable" || !row.url;
  }
  return true;
}

function withinDateWindow(row: AdminResourceRow, dateWindow: string) {
  if (dateWindow === "all") return true;
  const days = Number(dateWindow);
  const value = row.lastCheckedAt ?? row.updatedAt ?? row.createdAt;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  return time >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function healthLabel(row: AdminResourceRow) {
  if (row.healthStatus === "verified") return "verified";
  if (row.healthStatus === "stale") return "stale";
  if (row.healthStatus === "broken") return "broken";
  if (row.healthStatus === "restricted") return "restricted";
  if (row.healthStatus === "unverifiable") return "unverifiable";
  if (row.status === "pending_review") return "review";
  if (row.healthStatus === "pending") return row.source === "resource_bank" ? row.status : "pending";
  return row.status;
}

function statusTone(row: AdminResourceRow) {
  if (row.status === "pending_review") return "border-[#e7b84d] bg-[#fff7df] text-[#835a10]";
  if (row.healthStatus === "verified") return "border-[#6fbd7c] bg-[#ecf8ef] text-[#236534]";
  if (row.healthStatus === "stale" || row.healthStatus === "broken") return "border-[#e07463] bg-[#fff0ed] text-[#9a2f23]";
  if (row.healthStatus === "unverifiable") return "border-[#d1a35d] bg-[#fff8e8] text-[#7a5518]";
  if (row.addedBy === "discovery") return "border-[#a996e8] bg-[#f3efff] text-[#5f42b2]";
  return "border-[#c8c8c3] bg-[#f0f1ef] text-[#50565f]";
}

function sourceTone(row: AdminResourceRow) {
  if (row.source === "resource_bank" && row.addedBy === "discovery") {
    return "border-[#a996e8] bg-[#f3efff] text-[#5f42b2]";
  }
  if (row.source === "resource_bank") return "border-[#c8c8c3] bg-white text-[#1f2328]";
  return "border-[#dededb] bg-[#fbfbfa] text-[#50565f]";
}

function filterRows(
  rows: AdminResourceRow[],
  tab: TabId,
  source: Source | "all",
  status: string,
  dateWindow: string,
  query: string
) {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (!matchesTab(row, tab)) return false;
    if (source !== "all" && row.source !== source) return false;
    if (status !== "all" && row.status !== status && row.healthStatus !== status) return false;
    if (!withinDateWindow(row, dateWindow)) return false;
    if (needle) {
      const haystack = [row.name, row.url, row.description, row.authority, row.reason].join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [rows, setRows] = useState<AdminResourceRow[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [source, setSource] = useState<Source | "all">("all");
  const [status, setStatus] = useState("all");
  const [dateWindow, setDateWindow] = useState("30");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(KEY_STORAGE);
    if (stored) {
      setAdminKey(stored);
      setUnlocked(true);
    }
  }, []);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/resources?limit=1000", {
        headers: { "x-admin-key": key },
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as ApiResponse | null;
      if (res.status === 401) {
        sessionStorage.removeItem(KEY_STORAGE);
        setUnlocked(false);
        setErr("Invalid admin key.");
        return;
      }
      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? `Request failed (${res.status})`);
        return;
      }
      setRows(data.rows);
      setSummary(data.summary);
      setUnlocked(true);
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      setErr("Could not reach the admin API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked && adminKey) void load(adminKey);
  }, [adminKey, load, unlocked]);

  const visibleRows = useMemo(
    () => filterRows(rows, activeTab, source, status, dateWindow, query),
    [activeTab, dateWindow, query, rows, source, status]
  );

  const runAction = useCallback(
    async (row: AdminResourceRow, action: string) => {
      setActing(`${row.source}:${row.id}:${action}`);
      setErr(null);
      try {
        const res = await fetch("/api/admin/resource-action", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({ source: row.source, id: row.id, action }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setErr(data?.error ?? `${action} failed (${res.status})`);
          return;
        }
        await load(adminKey);
      } catch {
        setErr("Could not complete the admin action.");
      } finally {
        setActing(null);
      }
    },
    [adminKey, load]
  );

  const metrics = summary ?? {
    total: rows.length,
    aiBank: rows.filter((row) => row.source === "resource_bank").length,
    manualReview: rows.filter((row) => row.status === "pending_review").length,
    staleOrBroken: rows.filter((row) => row.healthStatus === "stale" || row.healthStatus === "broken").length,
    verified: rows.filter((row) => row.healthStatus === "verified").length,
    pendingDirectory: rows.filter((row) => row.source !== "resource_bank" && row.healthStatus === "pending").length,
    lastRun: rows.map((row) => row.lastCheckedAt).filter(Boolean).sort().at(-1) ?? null,
  };

  if (!unlocked) {
    return (
      <main className="min-h-dvh bg-[#f6f6f4] px-4 py-10 text-[#1f2328]">
        <section className="mx-auto max-w-md rounded-[10px] border border-[#dededb] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#69707a]">Admin</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Resource Operations</h1>
            <p className="mt-2 text-sm leading-6 text-[#69707a]">
              Unlock the unified console for AI bank resources, discovery, verification, and directory link checks.
            </p>
          </div>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (adminKey.trim()) void load(adminKey.trim());
            }}
          >
            <label className="block text-sm font-semibold">Admin key</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#69707a]" />
              <input
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                className="h-11 w-full rounded-[8px] border border-[#c8c8c3] bg-[#fbfbfa] pl-9 pr-3 text-sm outline-none focus:border-[#1f2328]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="h-10 w-full rounded-[8px] border border-[#1f2328] bg-[#1f2328] text-sm font-bold text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Checking..." : "Unlock console"}
            </button>
          </form>
          {err ? <p className="mt-4 text-sm text-[#9a2f23]">{err}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f6f6f4] text-[#1f2328]">
      <header className="border-b border-[#dededb] bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="text-sm font-bold">Dreamers Agent Admin</div>
          <div className="flex items-center gap-4 text-xs text-[#69707a]">
            <span>Resources</span>
            <span>Runs</span>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(KEY_STORAGE);
                setUnlocked(false);
                setAdminKey("");
              }}
              className="rounded-[7px] border border-[#dededb] bg-white px-3 py-1.5 font-semibold text-[#50565f]"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <section className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-[760] leading-tight tracking-tight">Resource Operations</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#69707a]">
              One control room for discovery, verification, public directory links, and manual review.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              title="Verifier runs through AWS Lambda/EventBridge. CLI trigger wiring is intentionally out of V1."
              className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#c8c8c3] bg-white px-3 text-xs font-bold text-[#69707a] disabled:cursor-not-allowed"
            >
              <ShieldAlert className="h-4 w-4" />
              Run verifier
            </button>
            <button
              type="button"
              disabled
              title="Discovery runs through AWS Lambda/EventBridge. CLI trigger wiring is intentionally out of V1."
              className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#a996e8] bg-[#f3efff] px-3 text-xs font-bold text-[#5f42b2] disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              Run discovery
            </button>
            <button
              type="button"
              onClick={() => void load(adminKey)}
              className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#1f2328] bg-[#1f2328] px-3 text-xs font-bold text-white"
              disabled={loading}
            >
              <RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </section>

        {err ? (
          <div className="mb-4 rounded-[8px] border border-[#e07463] bg-[#fff0ed] px-3 py-2 text-sm text-[#9a2f23]">
            {err}
          </div>
        ) : null}

        <section className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Metric icon={<Database className="h-4 w-4" />} value={metrics.aiBank} label="AI bank rows" />
          <Metric tone="review" icon={<AlertTriangle className="h-4 w-4" />} value={metrics.manualReview} label="manual review" />
          <Metric tone="stale" icon={<X className="h-4 w-4" />} value={metrics.staleOrBroken} label="stale or broken" />
          <Metric tone="verified" icon={<BadgeCheck className="h-4 w-4" />} value={metrics.verified} label="verified" />
          <Metric tone="run" icon={<CalendarClock className="h-4 w-4" />} value={relativeTime(metrics.lastRun)} label="last check/run" />
        </section>

        <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-[#dededb]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                "border-b-2 px-3 py-2 text-xs font-bold",
                activeTab === tab.id ? "border-[#1f2328] text-[#1f2328]" : "border-transparent text-[#69707a]",
                tab.tone === "violet" && activeTab !== tab.id && "text-[#5f42b2]",
                tab.tone === "green" && activeTab !== tab.id && "text-[#236534]",
                tab.tone === "amber" && activeTab !== tab.id && "text-[#835a10]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="grid items-start gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-[10px] border border-[#dededb] bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#69707a]">
              <Filter className="h-4 w-4" />
              Filters
            </div>
            <label className="mb-1 block text-xs font-bold text-[#50565f]">Search</label>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#69707a]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or URL"
                className="h-9 w-full rounded-[7px] border border-[#c8c8c3] bg-[#fbfbfa] pl-9 pr-3 text-sm outline-none focus:border-[#1f2328]"
              />
            </div>

            <label className="mb-1 block text-xs font-bold text-[#50565f]">Source</label>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as Source | "all")}
              className="mb-3 h-9 w-full rounded-[7px] border border-[#c8c8c3] bg-[#fbfbfa] px-2 text-sm outline-none focus:border-[#1f2328]"
            >
              <option value="all">All sources</option>
              <option value="resource_bank">AI resource bank</option>
              <option value="resources">Public resources</option>
              <option value="scholarships">Scholarships</option>
              <option value="mentorships">Mentorships</option>
            </select>

            <label className="mb-1 block text-xs font-bold text-[#50565f]">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mb-3 h-9 w-full rounded-[7px] border border-[#c8c8c3] bg-[#fbfbfa] px-2 text-sm outline-none focus:border-[#1f2328]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-bold text-[#50565f]">Date</label>
            <select
              value={dateWindow}
              onChange={(event) => setDateWindow(event.target.value)}
              className="h-9 w-full rounded-[7px] border border-[#c8c8c3] bg-[#fbfbfa] px-2 text-sm outline-none focus:border-[#1f2328]"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </aside>

          <section className="overflow-hidden rounded-[10px] border border-[#dededb] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dededb] px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-[#1f2328]">{TABS.find((tab) => tab.id === activeTab)?.label}</h2>
                <p className="mt-0.5 text-xs text-[#69707a]">
                  Showing {visibleRows.length} of {rows.length} loaded resources.
                </p>
              </div>
              {activeTab === "directory" ? (
                <span className="rounded-full border border-[#c8c8c3] bg-[#f0f1ef] px-2.5 py-1 text-xs font-bold text-[#50565f]">
                  {metrics.pendingDirectory} unchecked public links
                </span>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full border-collapse text-left text-xs">
                <thead className="bg-[#eeeeeb] text-[#4b515a]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Resource</th>
                    <th className="px-3 py-2 font-bold">Source</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                    <th className="px-3 py-2 font-bold">Run / Check</th>
                    <th className="px-3 py-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={`${row.source}:${row.id}`} className="border-t border-[#eeeeeb] align-top">
                      <td className="max-w-[390px] px-3 py-3">
                        <div className="font-bold text-[#1f2328]">{row.name}</div>
                        <div className="mt-1 line-clamp-2 text-[#69707a]">
                          {row.reason ?? row.description ?? (row.url ? "No description." : "Missing URL.")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {row.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full border border-[#dededb] bg-[#fbfbfa] px-2 py-0.5 text-[11px] text-[#50565f]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cx("rounded-full border px-2 py-1 text-[11px] font-bold", sourceTone(row))}>
                          {SOURCE_LABELS[row.source]}
                        </span>
                        <div className="mt-2 text-[#69707a]">{row.addedBy ?? row.kind}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cx("rounded-full border px-2 py-1 text-[11px] font-bold", statusTone(row))}>
                          {healthLabel(row)}
                        </span>
                        {row.linkHttpStatus ? <div className="mt-2 text-[#69707a]">HTTP {row.linkHttpStatus}</div> : null}
                      </td>
                      <td className="px-3 py-3 text-[#50565f]">
                        <div className={row.runKey?.startsWith("disc") ? "font-bold text-[#5f42b2]" : ""}>
                          {row.runKey ?? "manual"}
                        </div>
                        <div className="mt-1 text-[#69707a]">{formatDate(row.lastCheckedAt)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <RowActions row={row} acting={acting} onAction={runAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visibleRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[#69707a]">
                No resources match the current tab and filters.
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tone?: "review" | "stale" | "verified" | "run";
}) {
  return (
    <div
      className={cx(
        "min-h-[74px] rounded-[9px] border bg-white p-3 shadow-sm",
        !tone && "border-[#dededb]",
        tone === "review" && "border-[#e7b84d] bg-[#fff7df] text-[#835a10]",
        tone === "stale" && "border-[#e07463] bg-[#fff0ed] text-[#9a2f23]",
        tone === "verified" && "border-[#6fbd7c] bg-[#ecf8ef] text-[#236534]",
        tone === "run" && "border-[#a996e8] bg-[#f3efff] text-[#5f42b2]"
      )}
    >
      <div className="flex items-center gap-2 text-lg font-bold">
        {icon}
        {value}
      </div>
      <div className={cx("mt-1 text-xs", tone ? "text-current/80" : "text-[#69707a]")}>{label}</div>
    </div>
  );
}

function RowActions({
  row,
  acting,
  onAction,
}: {
  row: AdminResourceRow;
  acting: string | null;
  onAction: (row: AdminResourceRow, action: string) => Promise<void>;
}) {
  const busyPrefix = `${row.source}:${row.id}:`;
  const isBusy = Boolean(acting?.startsWith(busyPrefix));
  const buttonClass =
    "inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#c8c8c3] bg-white px-2 text-[11px] font-bold text-[#3f3f46] disabled:opacity-60";

  return (
    <div className="flex max-w-[230px] flex-wrap gap-1.5">
      {row.url ? (
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#c8c8c3] bg-white px-2 text-[11px] font-bold text-[#3f3f46]"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>
      ) : null}

      {row.source === "resource_bank" && row.status === "pending_review" ? (
        <>
          <button type="button" className={buttonClass} disabled={isBusy} onClick={() => onAction(row, "approve")}>
            <Check className="h-3 w-3" />
            Approve
          </button>
          <button type="button" className={buttonClass} disabled={isBusy} onClick={() => onAction(row, "reject")}>
            <X className="h-3 w-3" />
            Reject
          </button>
        </>
      ) : null}

      {row.source === "resource_bank" && row.status !== "pending_review" ? (
        <>
          <button type="button" className={buttonClass} disabled={isBusy} onClick={() => onAction(row, "request-recheck")}>
            Recheck
          </button>
          <button type="button" className={buttonClass} disabled={isBusy} onClick={() => onAction(row, "mark-valid")}>
            Mark valid
          </button>
        </>
      ) : null}

      {row.source !== "resource_bank" ? (
        <>
          <button type="button" className={buttonClass} disabled={isBusy || !row.url} onClick={() => onAction(row, "check-link")}>
            Check
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={isBusy}
            onClick={() => onAction(row, row.status === "archived" ? "activate" : "archive")}
          >
            {row.status === "archived" ? "Activate" : "Archive"}
          </button>
        </>
      ) : null}
    </div>
  );
}
