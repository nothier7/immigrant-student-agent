"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase";

async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Pass error back to the page via search params
    redirect(`/login?error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`);
  }
  redirect(redirectTo);
}

export async function signUpWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/profile/setup?new=1");

  const supabase = await createSupabaseServer();
  const origin = getOrigin();

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

export async function startGoogleOAuthAction(formData: FormData) {
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");
  const supabase = await createSupabaseServer();
  const origin = getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      queryParams: { prompt: "consent" }
    }
  });

  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "OAuth error")}`);
  }
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
