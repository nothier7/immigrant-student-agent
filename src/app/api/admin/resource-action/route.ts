export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminAuthError } from "../_utils";

type Source = "resource_bank";
type Action = "approve" | "reject" | "mark-valid" | "mark-stale" | "request-recheck";

const ACTIONS = new Set<Action>(["approve", "reject", "mark-valid", "mark-stale", "request-recheck"]);

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

  if (body?.source !== "resource_bank" || !body.id || !body.action || !ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "Invalid resource action request." }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

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
