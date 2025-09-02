import Link from "next/link";
import Header from "../components/Header";
import { signInWithPasswordAction } from "../actions/auth";
import Footer from "../components/Footer";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const error = typeof sp.error === "string" ? sp.error : undefined;
  const email = typeof sp.email === "string" ? sp.email : "";
  const redirect = typeof sp.redirect === "string" ? sp.redirect : "/ccny";

  return (
    <div className="min-h-screen bg-[rgb(249,250,251)] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased">
      <Header />
    <main className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Use your CUNY email to continue.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="my-6" />

      <form action={signInWithPasswordAction} className="space-y-3">
        <input type="hidden" name="redirect" value={redirect} />
        <div className="space-y-2">
          <label className="text-sm font-medium">CUNY email</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={email}
            placeholder="you@ccny.cuny.edu"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
            placeholder="Your password"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 text-sm font-semibold hover:opacity-95"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        New here?{" "}
        <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="underline">
          Create an account
        </Link>
      </p>
    </main>
    <Footer />
    </div>
  );
}
