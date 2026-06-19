export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { checkUrl } from "@/lib/link-checker";
import { getAdminAuthError } from "../_utils";

type Source = "resource_bank" | "resources" | "scholarships" | "mentorships";
type Action =
  | "approve"
  | "reject"
  | "mark-valid"
  | "mark-stale"
  | "request-recheck"
  | "archive"
  | "activate"
  | "check-link";

const SOURCES = new Set<Source>(["resource_bank", "resources", "scholarships", "mentorships"]);
const DIRECTORY_SOURCES = new Set<Source>(["resources", "scholarships", "mentorships"]);

function manualVerification(status: "valid" | "stale") {
  return {
    status,
    reason: status === "valid" ? "Manually marked valid by admin." : "Manually marked stale by admin.",
    confidence: 1,
    checked_at: new Date().toISOString(),
    facts: [],
  };
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as {
    source?: Source;
    id?: string;
    action?: Action;
  } | null;

  if (!body?.source || !body.id || !body.action || !SOURCES.has(body.source)) {
    return NextResponse.json({ error: "Invalid resource action request." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  if (body.source === "resource_bank") {
    if (body.action === "approve") {
      const { error } = await supabase
        .from("resource_bank")
        .update({ status: "unverified", updated_at: now })
        .eq("id", body.id)
        .eq("status", "pending_review");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reject") {
      const { error } = await supabase
        .from("resource_bank")
        .delete()
        .eq("id", body.id)
        .eq("status", "pending_review");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "mark-valid" || body.action === "mark-stale") {
      const status = body.action === "mark-valid" ? "valid" : "stale";
      const { error } = await supabase
        .from("resource_bank")
        .update({
          status,
          verification: manualVerification(status),
          last_verified_at: now,
          updated_at: now,
        })
        .eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "request-recheck") {
      const { error } = await supabase
        .from("resource_bank")
        .update({
          status: "unverified",
          verification: null,
          last_verified_at: null,
          updated_at: now,
        })
        .eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action for AI bank resource." }, { status: 400 });
  }

  if (!DIRECTORY_SOURCES.has(body.source)) {
    return NextResponse.json({ error: "Unsupported resource source." }, { status: 400 });
  }

  if (body.action === "archive" || body.action === "activate") {
    const { error } = await supabase
      .from(body.source)
      .update({ status: body.action === "archive" ? "archived" : "active", updated_at: now })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "check-link") {
    const { data, error } = await supabase.from(body.source).select("url").eq("id", body.id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const url = typeof data?.url === "string" ? data.url : "";
    if (!url) {
      return NextResponse.json({ error: "Resource does not have a URL to check." }, { status: 400 });
    }

    const result = await checkUrl(url);
    const { error: updateError } = await supabase
      .from(body.source)
      .update({
        link_status: result.status,
        link_checked_at: now,
        link_fail_count: result.status === "broken" || result.status === "timeout" ? 1 : 0,
        link_http_status: result.httpStatus ?? null,
        updated_at: now,
      })
      .eq("id", body.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ error: "Unsupported action for directory resource." }, { status: 400 });
}
