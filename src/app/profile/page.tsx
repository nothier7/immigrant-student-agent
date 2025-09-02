// app/profile/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { createSupabaseServer } from "@/lib/supabase-server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/profile")}`);
  }

  // Try to load a normalized profile first
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fallback to auth metadata (your existing approach):contentReference[oaicite:6]{index=6}
  const meta = (user?.user_metadata || {}) as Record<string, any>;

  const name =
    (profile?.name as string | undefined) ?? (meta.name as string) ?? "";
  const major =
    (profile?.major as string | undefined) ?? (meta.major as string) ?? "";
  const classification =
    (profile?.classification as string | undefined) ??
    (meta.classification as string) ??
    "";
  const immigrationStatus =
    (profile?.immigration_status as string | undefined) ??
    (meta.immigrationStatus as string) ??
    "prefer_not_to_say";
  const inStateTuition =
    (profile?.in_state_tuition as string | undefined) ??
    (meta.inStateTuition as string) ??
    "prefer_not_to_say";
  const workAuth =
    (profile?.work_auth as string | undefined) ??
    (meta.workAuth as string) ??
    "prefer_not_to_say";
  const school =
    (profile?.school as string | undefined) ??
    (meta.school as string) ??
    "ccny";

  const schoolLabels: Record<string, string> = {
    ccny: "CCNY — City College of New York",
    baruch: "Baruch College",
    hunter: "Hunter College",
    brooklyn: "Brooklyn College",
    queens: "Queens College",
    lehman: "Lehman College",
    csi: "College of Staten Island",
    york: "York College",
    bmcc: "Borough of Manhattan CC",
    hostos: "Hostos CC",
    kbcc: "Kingsborough CC",
    lagcc: "LaGuardia CC",
    qcc: "Queensborough CC",
    bronxcc: "Bronx CC",
    guttman: "Guttman CC",
    medgar: "Medgar Evers College",
    sps: "CUNY School of Professional Studies",
    soj: "Craig Newmark Grad School of Journalism",
    spuhc: "CUNY Grad School of Public Health",
    gradcenter: "CUNY Graduate Center",
    law: "CUNY School of Law",
    btech: "CUNY Baccalaureate (BA/BS)",
  };

  const pretty = (v: string) =>
    v === "prefer_not_to_say" ? "Prefer not to say" : v;

  return (
    <div className="min-h-screen bg-[rgb(249,250,251)] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pt-10">
      <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Manage your details to personalize recommendations.
      </p>

      <div className="mt-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 text-sm">
          <div>
            <div className="text-neutral-500">Email</div>
            <div className="mt-1 font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-neutral-500">Full name</div>
            <div className="mt-1 font-medium">{name || "—"}</div>
          </div>
          <div>
            <div className="text-neutral-500">School</div>
            <div className="mt-1 font-medium">
              {schoolLabels[school] || school}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Major</div>
            <div className="mt-1 font-medium">{major || "—"}</div>
          </div>
          <div>
            <div className="text-neutral-500">Classification</div>
            <div className="mt-1 font-medium">{classification || "—"}</div>
          </div>
          <div>
            <div className="text-neutral-500">Immigration status</div>
            <div className="mt-1 font-medium">{pretty(immigrationStatus)}</div>
          </div>
          <div>
            <div className="text-neutral-500">In-state tuition</div>
            <div className="mt-1 font-medium">{pretty(inStateTuition)}</div>
          </div>
          <div>
            <div className="text-neutral-500">Work authorization</div>
            <div className="mt-1 font-medium">{pretty(workAuth)}</div>
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            Missing something? You can update your profile anytime.
          </div>
          <Link
            href="/profile/setup"
            className="inline-flex items-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-semibold"
          >
            Edit profile
          </Link>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
