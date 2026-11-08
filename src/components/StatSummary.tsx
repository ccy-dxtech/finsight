import { formatNumber, formatPeriod } from "@/lib/format";

type StatSummaryProps = {
  totalAmount: bigint;
  transactionCount: number;
  periodStart: string;
  periodEnd: string;
  excludedCount: number;
};

export function StatSummary({ totalAmount, transactionCount, periodStart, periodEnd, excludedCount }: StatSummaryProps) {
  return (
    <dl className="grid grid-cols-2 gap-6 rounded-xl border border-hairline bg-canvas p-6 break-keep lg:grid-cols-[2fr_1fr_1fr_1fr]">
      <div className="min-w-0">
        <dt className="mb-1 text-body-sm text-muted">총지출</dt>
        <dd className="wrap-anywhere text-number-xl text-ink tabular-nums">{formatNumber(totalAmount)}<span className="ml-1 text-number-lg">원</span></dd>
      </div>
      <div><dt className="mb-1 text-body-sm text-muted">거래</dt><dd className="text-number-lg text-ink tabular-nums">{transactionCount.toLocaleString("ko-KR")}<span className="ml-1 text-body-sm">건</span></dd></div>
      <div className="min-w-0"><dt className="mb-1 text-body-sm text-muted">기간</dt><dd className="wrap-anywhere text-number-lg text-ink tabular-nums">{formatPeriod(periodStart, periodEnd)}</dd></div>
      <div><dt className="mb-1 text-body-sm text-muted">제외</dt><dd className="text-number-lg text-ink tabular-nums">{excludedCount.toLocaleString("ko-KR")}<span className="ml-1 text-body-sm">건</span></dd></div>
    </dl>
  );
}
