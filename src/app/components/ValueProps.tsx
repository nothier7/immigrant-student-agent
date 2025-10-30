export default function ValueProps() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { step: "01", title: "Tell us about you", desc: "Status, state, school level, GPA. No SSN needed." },
          { step: "02", title: "Review curated list", desc: "We filter scholarships, grants, and fellowships you're eligible for." },
          { step: "03", title: "Track & apply", desc: "Download your curated list with the links to apply." },
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
