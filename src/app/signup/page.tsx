"use client";
import { startGoogleOAuthAction, signUpWithPasswordAction } from "../actions/auth";


export default function Page({ searchParams }: { searchParams: { error?: string; email?: string; redirect?: string } }) {
  const redirectTo = searchParams.redirect ?? "/profile/setup?new=1";
  const seedEmail = searchParams.email ?? "";

  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-neutral-500">Start matching resources in minutes</p>

      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {searchParams.error}
        </div>
      )}

      {/* Google */}
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
        <span className="text-[11px] uppercase tracking-wider text-neutral-500">or</span>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <SignupForm seedEmail={seedEmail} redirectTo={redirectTo} />
      <p className="mt-6 text-sm text-neutral-600">
        Already have an account? <a href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="underline">Sign in</a>
      </p>
    </>
  );
}

import { useState, useRef } from "react";
function SignupForm({ seedEmail, redirectTo }: { seedEmail?: string; redirectTo: string }) {
  const [step, setStep] = useState<1 | 2>(seedEmail ? 2 : 1);
  const [email, setEmail] = useState(seedEmail ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {step === 1 && (
        <form
          onSubmit={(e) => { e.preventDefault(); setStep(2); setTimeout(() => nameRef.current?.focus(), 30); }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
              placeholder="you@ccny.cuny.edu"
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-neutral-900 text-white dark:bg白 dark:text-neutral-900 px-4 py-2.5 text-sm font-medium hover:opacity-95">
            Continue
          </button>
        </form>
      )}

      {step === 2 && (
        <form action={signUpWithPasswordAction} className="space-y-3">
          <input type="hidden" name="redirect" value={redirectTo} />
          <input type="hidden" name="email" value={email} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Full name (optional)</label>
            <input
              ref={nameRef}
              name="name"
              type="text"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
              placeholder="At least 8 characters"
              minLength={8}
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 text-sm font-medium hover:opacity-95">
            Create account
          </button>
          <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-neutral-500 underline mt-2">
            Use a different email
          </button>
        </form>
      )}
    </>
  );
}
