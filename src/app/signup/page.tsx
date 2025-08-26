import Link from "next/link";
import { startGoogleOAuthAction } from "../actions/auth";
import SignupForm from "./SignupForm";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const redirectTo =
    typeof sp.redirect === "string" ? sp.redirect : "/profile/setup?new=1";
  const seedEmail = typeof sp.email === "string" ? sp.email : "";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Start matching resources in minutes.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Google (server action) */}
      <form action={startGoogleOAuthAction} className="mt-6">
        <input type="hidden" name="redirect" value={redirectTo} />
        <button
          type="submit"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Continue with Google
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        <span className="text-[11px] uppercase tracking-wider text-neutral-500">
          or
        </span>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* Email / password (client component) */}
      <SignupForm seedEmail={seedEmail} redirectTo={redirectTo} />

      <p className="mt-6 text-sm text-neutral-600">
        Already have an account?{" "}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
          className="underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
