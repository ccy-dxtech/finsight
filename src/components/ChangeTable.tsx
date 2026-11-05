import { formatAmount } from "@/lib/format";

export function ChangeTable({ rows }: {
  rows: { category: string; last: bigint; current: bigint; diff: bigint }[];
}) {
  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-canvas p-6 break-keep">
      <h2 className="mb-4 text-title-md text-ink">카테고리별 전월 대비</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-body-sm">
          <caption className="sr-only">카테고리별 지난달과 이번 달 지출 비교</caption>
          <thead><tr>{["카테고리", "지난달", "이번 달", "증감"].map((label) => <th key={label} scope="col" className="border-b border-border-strong px-2 py-2 text-right text-label text-muted first:pl-0 first:text-left">{label}</th>)}</tr></thead>
          <tbody>{rows.map(({ category, last, current, diff }) => (
            <tr key={category}>
              <th scope="row" className="border-b border-hairline py-3 pr-2 text-left text-number-md text-ink">{category}</th>
              {[last, current].map((amount, index) => <td key={index} className="border-b border-hairline px-2 py-3 text-right text-number-md text-ink tabular-nums">{formatAmount(amount).slice(0, -1)}<span className="text-caption">원</span></td>)}
              <td className={`border-b border-hairline px-2 py-3 text-right text-number-md tabular-nums ${diff > 0n ? "text-change-up" : diff < 0n ? "text-change-down" : "text-muted"}`}>
                {diff > 0n ? "▲ +" : diff < 0n ? "▼ −" : ""}{formatAmount(diff < 0n ? -diff : diff).slice(0, -1)}<span className="text-caption">원</span>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-4 text-body-sm text-muted">이번 달과 지난달에 저장된 거래가 없어요.</p>}
    </section>
  );
}
