export default function ValueProps() {
  return (
    <section id="how" className="mx-auto max-w-7xl py-16 md:py-24 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { step: "01", title: "Tell us about you", desc: "Status, state, school level, GPA. No SSN needed." },
          { step: "02", title: "Review curated list", desc: "We filter scholarships, grants, and fellowships you're eligible for." },
          { step: "03", title: "Track & apply", desc: "Download your curated list with the links to apply." },
        ].map((item) => (
          <div key={item.step} className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
            <div className="text-xs tracking-widest text-neutral-500">STEP {item.step}</div>
            <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
