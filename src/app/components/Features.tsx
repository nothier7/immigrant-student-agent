import Card from "./Card";

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl py-16 md:py-24 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Personalized results" subtitle="We match on status, residency, major, GPA, and deadlines to avoid dead‑ends." />
        <Card title="One click apply kit" subtitle="Export or copy the list of scholarships and resources with the relevant links." />
        <Card title="Verified sources" subtitle="Every opportunity links to official pages with freshness checks." />
        <Card title="Privacy‑first" subtitle="No selling data. We only store what’s needed to help you win." />
      </div>
    </section>
  );
}
