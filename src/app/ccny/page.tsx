import Header from "../components/Header";
import Footer from "../components/Footer";
import AgentChat from "./AgentChat";
import IntakeWizard from "@/app/components/IntakeWizard";
import { Suspense } from "react";

export default function CCNYDemoPage() {
  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased transition-colors">
      {/* Subtle inspirational gradient to match landing */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(45,190,133,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.18),transparent_55%)]"
      />

      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-heading">CCNY Student Support</h1>
        <p className="mt-2 text-sm text-text/80">
          Ask about in-state tuition, NYS Dream Act/TAP, scholarships, grants, or CCNY immigrant resources.
        </p>
        <p className="mt-1 text-xs text-text/70">
          También puedes escribir en español.
        </p>
        <IntakeWizard variant="inline" initialSchoolCode="ccny" />
        <div className="mt-6">
          <Suspense fallback={<div className="text-sm text-text/70">Loading chat…</div>}>
            <AgentChat schoolCode="ccny" />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
