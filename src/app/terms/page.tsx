import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function TermsPage() {
  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-heading">Terms</h1>
        <p className="mt-3 text-sm text-text/80">
          This site provides informational guidance only and is not legal advice. Always verify eligibility,
          deadlines, and requirements with official CCNY/CUNY/HESC sources.
        </p>
        <p className="mt-3 text-sm text-text/80">
          We may update content over time. If you notice outdated information, please report it using the report
          link on each resource.
        </p>
      </main>
      <Footer />
    </div>
  );
}

