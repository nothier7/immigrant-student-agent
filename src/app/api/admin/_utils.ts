import { NextRequest, NextResponse } from "next/server";

export function getAdminAuthError(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_API_KEY || process.env.LINK_CHECK_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "Admin key is not configured." }, { status: 503 });
  }
  if (!key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function isoDateKey(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function textIncludes(value: unknown, needle: string) {
  return String(value ?? "").toLowerCase().includes(needle);
}
