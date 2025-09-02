// app/actions/profile.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function saveProfileAction(formData: FormData) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    // Not signed in — send them to login
    redirect(`/login?redirect=${encodeURIComponent("/profile/setup")}`);
  }

  // Read fields from the onboarding form (names match your <OnboardingForm />):contentReference[oaicite:1]{index=1}
  const payload = {
    name: String(formData.get("name") || ""),
    major: String(formData.get("major") || ""),
    classification: String(formData.get("classification") || ""),
    immigrationStatus: String(
      formData.get("immigrationStatus") || "prefer_not_to_say"
    ),
    inStateTuition: String(
      formData.get("inStateTuition") || "prefer_not_to_say"
    ),
    workAuth: String(formData.get("workAuth") || "prefer_not_to_say"),
    school: String(formData.get("school") || "ccny"),
  };

  // Where to go on success (your form currently sets /ccny):contentReference[oaicite:2]{index=2}
  const successRedirect = String(formData.get("redirect") || "/profile");

  // 1) Update auth.user metadata so your existing pages keep working:contentReference[oaicite:3]{index=3}:contentReference[oaicite:4]{index=4}
  const { error: updateUserError } = await supabase.auth.updateUser({
    data: payload,
  });
  if (updateUserError) {
    redirect(
      `/profile/setup?error=${encodeURIComponent(updateUserError.message)}`
    );
  }

  // 2) Upsert to profiles (relational source of truth)
  const { error: upsertError } = await supabase.from("profiles").upsert({
    user_id: user.id,
    email: user.email ?? null,
    name: payload.name,
    school: payload.school,
    major: payload.major,
    classification: payload.classification,
    immigration_status: payload.immigrationStatus,
    in_state_tuition: payload.inStateTuition,
    work_auth: payload.workAuth,
  });

  if (upsertError) {
    redirect(`/profile/setup?error=${encodeURIComponent(upsertError.message)}`);
  }

  // 3) All good — head to success page (e.g., /ccny per your current form)
  redirect(successRedirect);
}
