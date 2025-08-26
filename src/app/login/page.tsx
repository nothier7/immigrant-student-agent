import Link from "next/link";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // Narrow values safely
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const email = typeof sp.email === "string" ? sp.email : undefined;
  const redirect = typeof sp.redirect === "string" ? sp.redirect : "/ccny";

  return (
    <main className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-2xl font-semibold">Sign in (coming soon)</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Auth isn’t enabled yet. You can continue to the CCNY Agent and try the
        beta.
      </p>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={redirect || "/ccny"}
          className="inline-flex items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-semibold"
        >
          Go to CCNY Agent
        </Link>
        {email && (
          <span className="text-xs text-neutral-500">
            (detected email: <span className="font-mono">{email}</span>)
          </span>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        Note: Once auth is enabled, you’ll be able to sign in and save your
        profile. For now, everything runs without an account.
      </p>
    </main>
  );
}
