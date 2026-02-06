export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

const FALLBACK = [
  { code: "all-cuny", name: "All CUNY" },
  { code: "ccny", name: "City College of New York (CCNY)" },
];

export async function GET() {
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) {
    return NextResponse.json({ schools: FALLBACK });
  }

  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("school_hubs")
      .select("school_code, display_name, active")
      .eq("active", true)
      .order("display_name", { ascending: true });

    const schools = (data ?? []).map((s) => ({
      code: String(s.school_code).toLowerCase(),
      name: String(s.display_name),
    }));
    const withAll = [{ code: "all-cuny", name: "All CUNY" }, ...schools.filter((s) => s.code !== "all-cuny")];

    return NextResponse.json({ schools: withAll.length ? withAll : FALLBACK });
  } catch {
    return NextResponse.json({ schools: FALLBACK });
  }
}

