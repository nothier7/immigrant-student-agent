import { createSupabaseServer } from "@/lib/supabase-server";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import OnboardingForm from "./sections/OnboardingForm";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const email = user?.email ?? "";
  const name = (user?.user_metadata as any)?.name ?? "";

  return (
    <div className="min-h-screen bg-[rgb(249,250,251)] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pt-10">
      <h1 className="text-2xl font-semibold tracking-tight">Set up your profile</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Tell us a bit about you to personalize resources.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        <OnboardingForm email={email} name={name} />
      </div>
      </main>
      <Footer />
    </div>
  );
}
