"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase-server";

async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function isAllowedCunyEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  // Allow any *.cuny.edu or exactly cuny.edu
  return domain === "cuny.edu" || domain.endsWith(".cuny.edu");
}

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  const supabase = await createSupabaseServer();
  if (!isAllowedCunyEmail(email)) {
    redirect(`/login?error=${encodeURIComponent("Please use your school email (cuny.edu).")}&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Pass error back to the page via search params
    redirect(`/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
  }
  redirect(redirectTo);
}

export async function signUpWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/profile/setup?new=1");

  const supabase = await createSupabaseServer();
  if (!isAllowedCunyEmail(email)) {
    redirect(`/signup?error=${encodeURIComponent("Please use your school email (cuny.edu).")}&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  // Enforce strong password: 8+ chars, 1 uppercase, 1 digit, 1 special
  // Note: use \d in strings, but in regex literals it's just \d -> \d (single backslash)
  const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  if (!strong.test(password)) {
    const msg = "Password must be 8+ chars and include an uppercase letter, a number, and a special character.";
    redirect(`/signup?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
  }
  const origin = await getOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
    }
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  // If email confirm is ON, user must confirm; otherwise they’re signed in immediately.
  redirect(redirectTo);
}

export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
