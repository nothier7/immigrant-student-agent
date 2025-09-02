import { ArrowRight } from "lucide-react";
import PriceRow from "./PriceRow";

export default function CTA() {
  return (
    <section id="cta" className="mx-auto max-w-7xl pb-20 px-4">
      <div className="overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-semibold leading-tight">Start free. Upgrade when you’re ready.</h3>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
              Instant access to the scholarship finder. Pro adds mentor intros and deadline reminders.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a className="inline-flex items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-semibold" href="/signup">
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <a className="inline-flex items-center rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm" href="/try">
                View demo
              </a>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li>• No credit card required</li>
              <li>• Cancel anytime</li>
              <li>• Student friendly pricing</li>
            </ul>
          </div>

          <div className="relative p-8 md:p-12 border-t md:border-l md:border-t-0 border-black/10 dark:border-white/10">
            <div className="grid gap-4">
              <PriceRow plan="Free" price="$0" items={["Scholarship search", "Basic filters", "Save up to 5"]} />
              <PriceRow plan="Pro" price="$6/mo" highlight items={["Mentor network", "Smart reminders", "Unlimited saves"]} />
            </div>
            <p className="mt-4 text-xs text-neutral-500">Discounts for TheDream.US, CUNY, and SUNY students.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
