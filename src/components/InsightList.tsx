import { CircleAlert, Repeat } from "lucide-react";
import { formatAmount, formatDate } from "@/lib/format";
import type { ReportInsights } from "@/types";

export function InsightList({ recurring, anomalies }: Pick<ReportInsights, "recurring" | "anomalies">) {
  const sections = [
    { title: "정기결제·구독", Icon: Repeat, items: recurring.map(({ transactions, note }) => ({ transactions, observation: note })) },
    { title: "이상 지출", Icon: CircleAlert, items: anomalies.map(({ transaction, reason }) => ({ transactions: [transaction], observation: reason })) },
  ];
  return <div className="grid gap-6 break-keep">{sections.map(({ title, Icon, items }) => (
    <section key={title} className="rounded-xl border border-hairline bg-canvas p-6">
      <h2 className="mb-4 text-title-md text-ink">{title}</h2>
      {items.length ? <ul>{items.map(({ transactions, observation }, index) => (
        <li key={index} className="flex min-h-14 items-start gap-4 border-b border-hairline py-3 last:border-0">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-strong text-body"><Icon size={20} strokeWidth={1.5} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-number-md text-ink">{observation}</p>
            <ul>{transactions.map((transaction, transactionIndex) => <li key={transactionIndex} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="min-w-0 flex-1 wrap-anywhere text-body-sm text-muted"><span className="tabular-nums">{formatDate(transaction.occurredOn)}</span> · {transaction.merchant}</span>
              <span className="ml-auto text-right text-number-md text-ink tabular-nums">{formatAmount(transaction.amount).slice(0, -1)}<span className="text-caption">원</span></span>
            </li>)}</ul>
          </div>
        </li>
      ))}</ul> : <p className="text-body-md text-muted">{title} 항목이 발견되지 않았어요.</p>}
    </section>
  ))}</div>;
}
