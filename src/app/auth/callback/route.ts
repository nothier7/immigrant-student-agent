import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const error = searchParams.get("error");
  const redirectTo = searchParams.get("redirect") || "/ccny";

  if (error) {
    return NextResponse.redirect(new URL(`/auth/error?message=${encodeURIComponent(error)}`, req.url));
  }

  const supabase = await createSupabaseServer();
  try {
    const code = searchParams.get("code");
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Auth callback error";
    return NextResponse.redirect(new URL(`/auth/error?message=${encodeURIComponent(msg)}`, req.url));
  }

  // Enforce CUNY emails for OAuth sign-ins as well
  const { data } = await (await createSupabaseServer()).auth.getUser();
  const email = data.user?.email || "";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const isCuny = domain === "cuny.edu" || domain.endsWith(".cuny.edu");
  if (!isCuny) {
    await (await createSupabaseServer()).auth.signOut();
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Please use your school email (cuny.edu).")}`, req.url));
  }

  return NextResponse.redirect(new URL(redirectTo, req.url));
}
