export default function ValueProps() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { step: "01", title: "Pick your campus", desc: "Start at your CUNY hub or choose All CUNY in the directory." },
          { step: "02", title: "Browse verified resources", desc: "Scholarships, advising, benefits — with authority links and deadlines." },
          { step: "03", title: "Contribute a resource", desc: "See something missing? Submit it to help classmates." },
        ].map((item) => (
          <div
            key={item.step}
            className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-6 shadow-card"
          >
            <div className="text-xs tracking-widest text-text/60">STEP {item.step}</div>
            <h3 className="mt-2 text-lg font-semibold text-heading">{item.title}</h3>
            <p className="mt-2 text-sm text-text/80">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
