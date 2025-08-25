export default function PriceRow({
  plan,
  price,
  items,
  highlight,
}: {
  plan: string;
  price: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-neutral-900 dark:border-white" : "border-black/10 dark:border-white/10"}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">{plan}</div>
        <div className="text-lg font-semibold">{price}</div>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}
