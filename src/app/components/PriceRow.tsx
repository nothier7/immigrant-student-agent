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
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-[color:rgb(var(--primary))] bg-[color:rgb(var(--primary)/0.06)]"
          : "border-[color:rgb(var(--glass-border)/0.18)] bg-card"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold text-heading">{plan}</div>
        <div className="text-lg font-semibold text-heading">{price}</div>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-text/80">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}
