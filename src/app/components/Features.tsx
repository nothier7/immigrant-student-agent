import Card from "./Card";

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Filterable directory" subtitle="Search by campus, type, and deadlines — with clean, themed cards." />
        <Card title="School hubs" subtitle="Per-campus pages with quick links, featured items, and upcoming deadlines." />
        <Card title="Ask the agent (CCNY)" subtitle="Demo the chat UI for CCNY while we expand to more schools." />
        <Card title="Community submissions" subtitle="Suggest new resources; admins review to keep quality high." />
      </div>
    </section>
  );
}
