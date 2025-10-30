import Link from "next/link";
import Header from "../components/Header";
import { signInWithPasswordAction } from "../actions/auth";
import Footer from "../components/Footer";
import { AuthCard } from "../components/AuthCard";
import { buttonCn } from "../components/ui/Button";

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
    <div className="min-h-screen bg-bg text-text antialiased">
      <Header />
      <main className="mx-auto max-w-md px-4 pt-12">
        <AuthCard title="Sign in" subtitle="Use your CUNY email to continue.">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

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
                className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.22)] bg-transparent px-3 py-2 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.22)] bg-transparent px-3 py-2 outline-none"
                placeholder="Your password"
              />
            </div>
            <button type="submit" className={buttonCn({ variant: "primary", size: "md" })}>
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm text-text/80">
            New here?{" "}
            <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </AuthCard>
      </main>
      <Footer />
    </div>
  );
}
