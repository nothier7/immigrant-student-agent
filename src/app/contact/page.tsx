import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function ContactPage() {
  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-heading">Contact</h1>
        <p className="mt-3 text-sm text-text/80">
          Have feedback or a resource to add? Use the submission form from any school hub, or email us at
          <a className="ml-1 underline underline-offset-4" href="mailto:hello@dreamersagent.org">
            hello@dreamersagent.org
          </a>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}

