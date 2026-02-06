export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { checkUrl, type LinkCheckStatus } from "@/lib/link-checker";

type TableConfig = { name: "scholarships" | "mentorships" | "resources" };

const TABLES: TableConfig[] = [
  { name: "scholarships" },
  { name: "mentorships" },
  { name: "resources" },
];

const DEFAULT_LIMIT = 60;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_FAIL_THRESHOLD = 2;
const CONCURRENCY = 6;

function canArchive(status: LinkCheckStatus) {
  return status === "broken" || status === "timeout";
}

async function processInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = CONCURRENCY
) {
  let index = 0;
  const runners = Array.from({ length: concurrency }).map(async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-link-check-secret") || req.nextUrl.searchParams.get("secret");
  const requiredSecret = process.env.LINK_CHECK_SECRET;
  if (!requiredSecret || secret !== requiredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const timeoutMs = Number(req.nextUrl.searchParams.get("timeoutMs") ?? DEFAULT_TIMEOUT_MS);
  const failThreshold = Number(req.nextUrl.searchParams.get("failThreshold") ?? DEFAULT_FAIL_THRESHOLD);

  const supabase = createSupabaseAdmin();
  const summary: Record<string, Record<string, number>> = {};

  for (const table of TABLES) {
    summary[table.name] = {
      checked: 0,
      ok: 0,
      redirect: 0,
      restricted: 0,
      broken: 0,
      timeout: 0,
      archived: 0,
      skipped: 0,
    };

    const { data } = await supabase
      .from(table.name)
      .select("id,url,link_fail_count,status")
      .eq("status", "active")
      .limit(Number.isFinite(limit) ? limit : DEFAULT_LIMIT);

    const rows = (data ?? []).filter((r) => r?.url);

    await processInBatches(rows, async (row) => {
      const res = await checkUrl(String(row.url), timeoutMs);
      summary[table.name].checked += 1;
      summary[table.name][res.status] += 1;

      const prevFails = Number(row.link_fail_count ?? 0);
      const nextFails = canArchive(res.status) ? prevFails + 1 : 0;
      const shouldArchive = canArchive(res.status) && nextFails >= failThreshold;

      const update: Record<string, unknown> = {
        link_status: res.status,
        link_checked_at: new Date().toISOString(),
        link_fail_count: nextFails,
        link_http_status: res.httpStatus ?? null,
      };
      if (shouldArchive) {
        update.status = "archived";
      }

      const { error } = await supabase.from(table.name).update(update).eq("id", row.id);
      if (!error && shouldArchive) {
        summary[table.name].archived += 1;
      }
    });

    summary[table.name].skipped = (data?.length ?? 0) - rows.length;
  }

  return NextResponse.json({
    ok: true,
    limit,
    timeoutMs,
    failThreshold,
    summary,
  });
}
