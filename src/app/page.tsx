import { Header, Hero, Features, ValueProps, CTA, Footer } from "./components";

export default function Home() {
  return (
    <div className="min-h-screen bg-[rgb(249,250,251)] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased">
      <Header />
      <main>
        <Hero />
        <Features />
        <ValueProps />
      </main>
      <Footer />
    </div>
  );
}
