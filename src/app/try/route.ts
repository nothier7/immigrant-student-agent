import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const isAuthed = !!data.user;

  const dest = isAuthed ? "/ccny" : `/login?redirect=${encodeURIComponent("/ccny")}`;
  return NextResponse.redirect(new URL(dest, req.url));
}

