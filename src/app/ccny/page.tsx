import Header from "../components/Header";
import Footer from "../components/Footer";
import AgentChat from "./AgentChat";

export default function CCNYDemoPage() {
  return (
    <div className="min-h-dvh bg-[rgb(249,250,251)] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">CCNY Student Support (Beta)</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Ask about in-state tuition, NYS Dream Act/TAP, scholarships, grants, or CCNY immigrant resources.
        </p>
        <div className="mt-6">
          <AgentChat />
        </div>
      </main>
      <Footer />
    </div>
  );
}
