import { formatNumber } from "@/lib/format";

type CategoryBarsProps = {
  rows: { label: string; amount: bigint; ratio: number }[];
};

export function CategoryBars({ rows }: CategoryBarsProps) {
  const sorted = rows.filter(({ amount }) => amount !== 0n)
    .sort((a, b) => a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0);
  const max = sorted[0]?.amount ?? 0n;
  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-canvas p-6 break-keep">
      <h2 className="mb-4 text-title-md text-ink">카테고리별 지출</h2>
      <ul className="grid gap-3">
        {sorted.map(({ label, amount, ratio }) => (
          <li key={label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-body-sm sm:grid-cols-[96px_1fr_108px_44px]">
            <span className="text-body">{label}</span>
            <span aria-hidden="true" className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
              {amount > 0n && <span className="block h-3 overflow-hidden rounded-pill bg-surface-strong"><span className="block h-full rounded-pill bg-primary" style={{ width: `${Number(amount * 10000n / max) / 100}%` }} /></span>}
            </span>
            <span className="text-right text-number-md text-ink tabular-nums">{formatNumber(amount)}<span className="text-caption">원</span></span>
            <span className="text-right text-body-sm text-muted tabular-nums">{ratio}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
