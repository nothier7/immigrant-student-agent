"use client";

import { useRef, useState } from "react";
import { signUpWithPasswordAction } from "../actions/auth";
import { buttonCn } from "../components/ui/Button";

export default function SignupForm({
  seedEmail,
  redirectTo,
}: {
  seedEmail?: string;
  redirectTo: string;
}) {
  const [step, setStep] = useState<1 | 2>(seedEmail ? 2 : 1);
  const [email, setEmail] = useState(seedEmail ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
            setTimeout(() => nameRef.current?.focus(), 30);
          }}
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
          <button type="submit" className={buttonCn({ variant: "primary", size: "md" })}>
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
              className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.22)] bg-transparent px-3 py-2 outline-none"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
                name="password"
                type="password"
                required
                minLength={8}
                // Avoid fragile lookaheads; split checks into simpler groups if possible.
                // Still using a consolidated pattern? Keep it conservative:
                pattern="(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                title="Must be 8+ characters and include an uppercase letter, a number, and a special character."
                autoComplete="new-password"
                className="w-full rounded-xl border border-[color:rgb(var(--glass-border)/0.22)] bg-transparent px-3 py-2 outline-none"
            />

            <p className="text-xs text-text/70">Must be 8+ characters and include at least 1 uppercase letter, 1 number, and 1 special character.</p>
          </div>

          <button type="submit" className={buttonCn({ variant: "primary", size: "md" })}>
            Create account
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full mt-2 text-xs text-text/70 underline underline-offset-4"
          >
            Use a different email
          </button>
        </form>
      )}
    </>
  );
}
