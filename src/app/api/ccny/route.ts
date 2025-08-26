
export const dynamic = "force-dynamic";

export const runtime = "nodejs"; // ensure Node runtime on Vercel
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.PY_BACKEND_URL ?? "http://127.0.0.1:8001/chat";
const TIMEOUT_MS = Number(process.env.CCNY_API_TIMEOUT_MS ?? 55000);

type Source = { url: string; title?: string | null };
export type UICard = {
  name: string;
  url: string;
  category: string;
  why?: string | null;
  deadline?: string | null;
  authority?: string | null;
};
type ChatResp = {
  session_id?: string;
  ask?: string | null;
  intent?: string | null;
  answer_text?: string | null;
  sources?: Source[];
  cards?: UICard[];
  error?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
        "user-agent": req.headers.get("user-agent") ?? "ccny-web",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await r.text();
    const data: ChatResp = (() => {
      try {
        return JSON.parse(text) as ChatResp;
      } catch {
        return { error: text };
      }
    })();

    return NextResponse.json(data, { status: r.status });
  } catch (err) {
    const isAbort = (err as { name?: string } | undefined)?.name === "AbortError";
    const status = isAbort ? 504 : 502;
    const msg = isAbort ? "Upstream API timeout (Render cold start?)" : "Upstream API unavailable";
    const data: ChatResp = { error: msg };
    return NextResponse.json(data, { status });
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.PY_BACKEND_URL),
    api: API_URL,
  });
}
