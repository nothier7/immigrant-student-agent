export default function Card({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-5 shadow-card">
      <h3 className="text-base font-semibold leading-tight text-heading">{title}</h3>
      <p className="mt-2 text-sm text-text/80">{subtitle}</p>
    </div>
  );
}
