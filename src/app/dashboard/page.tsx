import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { createSupabaseServer } from "@/lib/supabase";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-dvh grid place-items-center p-10">
        <div className="text-center">
          <p className="text-lg">You need to log in.</p>
          <p className="mt-2"><Link href="/login" className="underline">Go to Login</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Welcome, {user.email}</h1>
          <form action={signOutAction}><button className="rounded-xl px-3 py-2 text-sm ring-1 ring-neutral-300 hover:bg-neutral-100 dark:ring-neutral-700 dark:hover:bg-neutral-800">Sign out</button></form>
        </div>
        <div className="mt-8 rounded-2xl border p-6 dark:border-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">This page is protected. Next step: redirect new users to the profile wizard.</p>
          <p className="mt-4 text-sm"><Link href="/profile/setup" className="underline">Complete your profile</Link></p>
        </div>
      </div>
    </main>
  );
}