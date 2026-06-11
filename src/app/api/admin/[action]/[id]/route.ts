export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const CHAT_URL = process.env.PY_BACKEND_URL ?? "http://127.0.0.1:8001/chat";
const API_BASE = CHAT_URL.replace(/\/chat\/?$/, "");

const ACTIONS = new Set(["approve", "reject"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string; id: string }> }
) {
  const { action, id } = await params;
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }

  const key = req.headers.get("x-admin-key");
  if (!key) {
    return NextResponse.json({ error: "Missing admin key" }, { status: 401 });
  }

  try {
    const r = await fetch(`${API_BASE}/admin/${action}/${encodeURIComponent(id)}`, {
      method: "POST",
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
