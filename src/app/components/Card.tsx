export default function Card({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-neutral-900/60">
      <h3 className="text-base font-semibold leading-tight">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{subtitle}</p>
    </div>
  );
}
