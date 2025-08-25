import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect") ?? "/dashboard";

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(url.toString());
  // Even if there’s an error, push through and let the app decide
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
