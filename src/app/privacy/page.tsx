import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="relative min-h-dvh bg-bg text-text antialiased">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-heading">Privacy</h1>
        <p className="mt-3 text-sm text-text/80">
          We only collect the data you choose to share. If you submit a resource or request reminders, your
          information is used to review the submission or send the requested update. We do not sell your data.
        </p>
        <p className="mt-3 text-sm text-text/80">
          The chat experience does not require an account. Avoid sharing sensitive personal details in chat.
        </p>
      </main>
      <Footer />
    </div>
  );
}

