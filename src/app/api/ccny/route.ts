export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// If your Render API is in Oregon (US West), prefer a West region on Vercel:
export const preferredRegion = ["sfo1"]; // or remove if you don't want to pin
export const maxDuration = 30; // seconds

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.PY_BACKEND_URL ?? "http://127.0.0.1:8001/chat";
// Keep the client timeout < server deadline (server uses WORKFLOW_TIMEOUT_S=18 by default)
const TIMEOUT_MS = Number(process.env.CCNY_API_TIMEOUT_MS ?? 30000);

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

function fallback(sessionId?: string): ChatResp {
  // Same links as server-side fallback so the UI stays consistent
  const sources: Source[] = [
    { url: "https://www.ccny.cuny.edu/immigrantstudentcenter" },
    { url: "https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition" },
    { url: "https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships" },
    { url: "https://www.ccny.cuny.edu/immigrantstudentcenter/financial-aid" },
    { url: "https://www.hesc.ny.gov/applying-aid/nys-dream-act/" },
    { url: "https://www.thedream.us/" },
    { url: "https://immigrantsrising.org/resource/scholarships/" },
  ];

  return {
    session_id: sessionId,
    answer_text:
      "Our server is waking up and fetching sources. Here are key links to get you started right now.",
    sources,
    cards: [],
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const sessionId =
    (body?.["session_id"] as string | undefined) ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`);

  try {
    // Simpler timeout: AbortSignal.timeout is supported in Node 18+
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
        "user-agent": req.headers.get("user-agent") ?? "ccny-web",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const text = await r.text();
    let data: ChatResp;
    try {
      data = JSON.parse(text) as ChatResp;
    } catch {
      // Backend returned non-JSON (e.g., error page) — still give a graceful fallback
      data = fallback(sessionId);
    }
    return NextResponse.json(data, { status: r.status });
  } catch (err: unknown) {
    const isAbort = (err as { name?: string } | undefined)?.name === "AbortError";
    // On timeout or network failure, return a helpful, structured fallback (200 OK)
    const data = fallback(sessionId);
    // If you prefer to reflect a gateway status, switch to 504/502 — but 200 keeps your UI simpler.
    return NextResponse.json(data, { status: isAbort ? 200 : 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.PY_BACKEND_URL),
    api: API_URL,
    timeoutMs: TIMEOUT_MS,
  });
}
