export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { asStringArray, getAdminAuthError, isoDateKey, textIncludes } from "../_utils";

type Source = "resource_bank";
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
  kind: "ai-bank";
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

type RawRow = Record<string, unknown>;

function verificationReason(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.reason === "string" ? record.reason : null;
}

function verificationCheckedAt(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.checked_at === "string" ? record.checked_at : null;
}

function bankHealth(status: string): HealthStatus {
  if (status === "valid") return "verified";
  if (status === "stale") return "stale";
  if (status === "unverifiable") return "unverifiable";
  if (status === "pending_review" || status === "unverified") return "pending";
  return "unknown";
}

function normalizeBank(row: RawRow): AdminResourceRow {
  const status = String(row.status ?? "unknown");
  const checkedAt = (row.last_verified_at as string | null) ?? verificationCheckedAt(row.verification);
  const createdAt = String(row.created_at ?? new Date().toISOString());
  const addedBy = typeof row.added_by === "string" ? row.added_by : null;
  const runPrefix = addedBy === "discovery" ? "disc" : checkedAt ? "verify" : null;
  const runDate = isoDateKey(checkedAt ?? createdAt);

  return {
    id: String(row.id),
    source: "resource_bank",
    kind: "ai-bank",
    name: String(row.name ?? "Untitled resource"),
    url: typeof row.url === "string" ? row.url : null,
    description: typeof row.description === "string" ? row.description : null,
    authority: typeof row.authority === "string" ? row.authority : null,
    status,
    healthStatus: bankHealth(status),
    addedBy,
    runKey: runPrefix && runDate ? `${runPrefix}-${runDate}` : null,
    lastCheckedAt: checkedAt,
    createdAt,
    updatedAt: (row.updated_at as string | null) ?? null,
    reason: verificationReason(row.verification),
    tags: asStringArray(row.tags),
    sourceTier: typeof row.source_tier === "number" ? row.source_tier : null,
    linkStatus: null,
    linkFailCount: null,
    linkHttpStatus: null,
  };
}

function matchesTab(row: AdminResourceRow, tab: string) {
  if (tab === "ai-bank") return row.source === "resource_bank";
  if (tab === "discovery") return row.source === "resource_bank" && row.addedBy === "discovery";
  if (tab === "verification") return row.source === "resource_bank" && Boolean(row.lastCheckedAt);
  if (tab === "manual-review") {
    return (
      row.status === "pending_review" ||
      row.healthStatus === "stale" ||
      row.healthStatus === "broken" ||
      row.healthStatus === "unverifiable" ||
      !row.url
    );
  }
  return true;
}

function applyFilters(rows: AdminResourceRow[], req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const source = params.get("source");
  const status = params.get("status");
  const tab = params.get("tab") ?? "overview";
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");

  const sources = source ? new Set(source.split(",").filter(Boolean)) : null;
  const statuses = status ? new Set(status.split(",").filter(Boolean)) : null;
  const fromTime = dateFrom ? Date.parse(dateFrom) : null;
  const toTime = dateTo ? Date.parse(`${dateTo}T23:59:59.999Z`) : null;

  return rows.filter((row) => {
    if (sources && !sources.has(row.source)) return false;
    if (statuses && !statuses.has(row.status) && !statuses.has(row.healthStatus)) return false;
    if (!matchesTab(row, tab)) return false;
    if (q) {
      const hit =
        textIncludes(row.name, q) ||
        textIncludes(row.url, q) ||
        textIncludes(row.description, q) ||
        textIncludes(row.authority, q);
      if (!hit) return false;
    }
    if (fromTime || toTime) {
      const time = Date.parse(row.lastCheckedAt ?? row.createdAt);
      if (fromTime && time < fromTime) return false;
      if (toTime && time > toTime) return false;
    }
    return true;
  });
}

function buildSummary(rows: AdminResourceRow[]) {
  const aiRows = rows.filter((row) => row.source === "resource_bank");
  const review = rows.filter((row) => row.status === "pending_review").length;
  const stale = rows.filter((row) => row.healthStatus === "stale" || row.healthStatus === "broken").length;
  const verified = rows.filter((row) => row.healthStatus === "verified").length;
  const lastRun = rows
    .map((row) => row.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    total: rows.length,
    aiBank: aiRows.length,
    manualReview: review,
    staleOrBroken: stale,
    verified,
    lastRun,
  };
}

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return authError;

  const supabase = createSupabaseAdmin();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 500), 1000);

  const bank = await supabase
    .from("resource_bank")
    .select(
      "id,name,url,description,authority,status,source_tier,tags,last_verified_at,verification,added_by,created_at,updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (bank.error) {
    return NextResponse.json({ error: bank.error.message ?? "Could not load resources." }, { status: 500 });
  }

  const rows: AdminResourceRow[] = ((bank.data ?? []) as unknown as RawRow[]).map((row) => normalizeBank(row));

  rows.sort((a, b) => {
    const aTime = Date.parse(a.lastCheckedAt ?? a.updatedAt ?? a.createdAt);
    const bTime = Date.parse(b.lastCheckedAt ?? b.updatedAt ?? b.createdAt);
    return bTime - aTime;
  });

  const filtered = applyFilters(rows, req);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: buildSummary(rows),
    total: filtered.length,
    rows: filtered.slice(0, limit),
  });
}
