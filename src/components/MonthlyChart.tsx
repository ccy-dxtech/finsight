import { formatMonth, formatNumber } from "@/lib/format";

export function MonthlyChart({ rows }: { rows: { month: string; total: bigint }[] }) {
  const sorted = [...rows].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
  const max = sorted.reduce((value, row) => row.total > value ? row.total : value, 0n);
  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-canvas p-6 break-keep">
      <h2 className="mb-4 text-title-md text-ink">월별 총지출</h2>
      <ul className="grid gap-3">
        {sorted.map(({ month, total }) => (
          <li key={month} className="grid grid-cols-[1fr_auto] items-center gap-3 text-body-sm sm:grid-cols-[120px_1fr_auto]">
            <span className="text-body">{formatMonth(month)}</span>
            <span aria-hidden="true" className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
              {total > 0n && <span className="block h-3 overflow-hidden rounded-pill bg-surface-strong"><span className="block h-full rounded-pill bg-primary" style={{ width: `${Number(total * 10000n / max) / 100}%` }} /></span>}
            </span>
            <span className="text-right text-number-md text-ink tabular-nums">{formatNumber(total)}<span className="text-caption">원</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
