import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
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
    <div className="min-h-screen bg-[rgb(249,250,251)] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased">
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Start matching resources in minutes.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

      <div className="my-6" />

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
      </main>
      <Footer />
    </div>
  );
}
