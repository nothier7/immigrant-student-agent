import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ResourceSubmitForm from "@/app/components/ResourceSubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const schoolCode = (code || "").toLowerCase();

  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      {/* Gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(45,190,133,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.18),transparent_55%)]"
      />

      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-heading">Submit a resource</h1>
        <p className="mt-2 text-sm text-text/80">
          Suggest a scholarship, mentorship, or campus resource for {schoolCode.toUpperCase()}.
          Submissions are reviewed before they appear in the directory.
        </p>

        <div className="mt-6 rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-4 shadow-card">
          <ResourceSubmitForm schoolCode={schoolCode} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

