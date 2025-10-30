import { ArrowRight } from "lucide-react";
import PriceRow from "./PriceRow";
import { buttonCn } from "@/app/components/ui/Button";

export default function CTA() {
  return (
    <section id="cta" className="mx-auto max-w-7xl px-4 pb-20">
      <div className="overflow-hidden rounded-3xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-semibold leading-tight text-heading">
              Start free. Upgrade when you’re ready.
            </h3>
            <p className="mt-3 text-sm text-text/80">
              Instant access to the scholarship finder. Pro adds mentor intros and deadline reminders.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a className={buttonCn({ variant: "primary", size: "md" })} href="/signup">
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <a className={buttonCn({ variant: "outline", size: "md" })} href="/try">
                View demo
              </a>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-text/80">
              <li>• No credit card required</li>
              <li>• Cancel anytime</li>
              <li>• Student friendly pricing</li>
            </ul>
          </div>

          <div className="relative border-t border-[color:rgb(var(--glass-border)/0.18)] p-8 md:border-l md:border-t-0 md:p-12">
            <div className="grid gap-4">
              <PriceRow plan="Free" price="$0" items={["Scholarship search", "Basic filters", "Save up to 5"]} />
              <PriceRow plan="Pro" price="$6/mo" highlight items={["Mentor network", "Smart reminders", "Unlimited saves"]} />
            </div>
            <p className="mt-4 text-xs text-text/70">
              Discounts for TheDream.US, CUNY, and SUNY students.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
