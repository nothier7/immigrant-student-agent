import Header from "./components/Header";
import Hero from "./components/Hero";
import Features from "./components/Features";
import ValueProps from "./components/ValueProps";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-bg text-text antialiased transition-colors">
      {/* Inspirational soft gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(45,190,133,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.14),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.10),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(96,165,250,0.18),transparent_55%)]"
      />

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
