export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

// PY_BACKEND_URL points at the /chat endpoint; admin endpoints share its base.
const CHAT_URL = process.env.PY_BACKEND_URL ?? "http://127.0.0.1:8001/chat";
const API_BASE = CHAT_URL.replace(/\/chat\/?$/, "");

export async function GET(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  if (!key) {
    return NextResponse.json({ error: "Missing admin key" }, { status: 401 });
  }

  try {
    const r = await fetch(`${API_BASE}/admin/pending`, {
      headers: { "x-admin-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json().catch(() => ({ error: "Bad response from backend" }));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
