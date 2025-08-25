import { NextRequest, NextResponse } from "next/server";

const PY_BACKEND_URL = process.env.PY_BACKEND_URL || "http://127.0.0.1:8001/chat";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(PY_BACKEND_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); }
  catch { data = { error: text }; }

  return NextResponse.json(data, { status: r.status });
}
