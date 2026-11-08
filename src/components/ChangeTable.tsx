import { formatMonth, formatNumber } from "@/lib/format";
import { Button } from "./Button";

export function ChangeTable({ rows, currentMonth, previousMonth }: {
  rows: { category: string; last: bigint; current: bigint; diff: bigint }[];
  currentMonth: string;
  previousMonth: string;
}) {
  const [previousLabel, currentLabel] = [formatMonth(previousMonth), formatMonth(currentMonth)];
  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-canvas p-6 break-keep">
      <h2 className="mb-4 text-title-md text-ink">카테고리별 전월 대비</h2>
      {rows.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-body-md text-muted">{previousLabel} 명세서를 올리면 카테고리별로 늘고 준 금액을 볼 수 있어요.</p>
          <Button href="/dashboard" variant="primary" size="md">명세서 올리기</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-body-sm">
            <caption className="sr-only">카테고리별 {previousLabel}과 {currentLabel} 지출 비교</caption>
            <thead><tr>{["카테고리", previousLabel, currentLabel, "증감"].map((label) => <th key={label} scope="col" className="border-b border-border-strong px-2 py-2 text-right text-label text-muted first:pl-0 first:text-left">{label}</th>)}</tr></thead>
            <tbody>{rows.map(({ category, last, current, diff }) => (
              <tr key={category}>
                <th scope="row" className="border-b border-hairline py-3 pr-2 text-left text-number-md text-ink">{category}</th>
                {[last, current].map((amount, index) => <td key={index} className="border-b border-hairline px-2 py-3 text-right text-number-md text-ink tabular-nums">{formatNumber(amount)}<span className="text-caption">원</span></td>)}
                <td className={`border-b border-hairline px-2 py-3 text-right text-number-md tabular-nums ${diff > 0n ? "text-change-up" : diff < 0n ? "text-change-down" : "text-muted"}`}>
                  {diff > 0n ? "▲ +" : diff < 0n ? "▼ −" : ""}{formatNumber(diff < 0n ? -diff : diff)}<span className="text-caption">원</span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
