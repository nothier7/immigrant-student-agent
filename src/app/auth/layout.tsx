import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[rgb(249,250,251)] dark:bg-neutral-950">
      {/* Top bar to match your site */}
      <header className="sticky top-0 z-10 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-950/70 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Immigrant Student Agent</div>
          <Link href="/" className="text-sm opacity-80 hover:opacity-100">Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        <div className="py-10 sm:py-14 grid place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-900 shadow-sm">
            <div className="p-6 sm:p-8">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs text-neutral-500">
            By continuing, you agree to our <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
