import Header from "../components/Header";
import Footer from "../components/Footer";
import { AuthCard } from "../components/AuthCard";
import Link from "next/link";
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
    <div className="min-h-screen bg-bg text-text antialiased">
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        <AuthCard title="Create your account" subtitle="Start matching resources in minutes.">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Email / password (client component) */}
          <SignupForm seedEmail={seedEmail} redirectTo={redirectTo} />

          <p className="mt-6 text-sm text-text/80">
            Already have an account?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
              className="underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </AuthCard>
      </main>
      <Footer />
    </div>
  );
}
