import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { StatSummary } from "@/components/StatSummary";
import { CategoryBars } from "@/components/CategoryBars";
import { InsightList } from "@/components/InsightList";
import { SavingTip } from "@/components/SavingTip";
import type { ReportInsights, Transaction } from "@/types";

type StoredTransaction = Omit<Transaction, "amount"> & { amount: string };
type StoredInsights = Omit<ReportInsights, "recurring" | "anomalies"> & {
  recurring: { transactions: StoredTransaction[]; note: string }[];
  anomalies: { transaction: StoredTransaction; reason: string }[];
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: report, error } = await supabase.from("reports")
    .select("file_name,period_start,period_end,transaction_count,excluded_count,totals,insights")
    .eq("id", id).maybeSingle();
  if (error?.code === "22P02") notFound();
  if (error) throw new Error("리포트를 불러오지 못했어요.");
  if (!report) notFound();

  const insights = report.insights as StoredInsights;
  const restoreTransaction = (transaction: StoredTransaction): Transaction => ({ ...transaction, amount: BigInt(transaction.amount) });
  const categories = Object.entries(report.totals.categoryTotals as Record<string, string>)
    .map(([label, amount]) => ({ label, amount: BigInt(amount) }));
  const positiveTotal = categories.reduce((sum, { amount }) => sum + (amount > 0n ? amount : 0n), 0n);
  const rows = categories.map(({ label, amount }) => ({
    label, amount,
    ratio: amount > 0n && positiveTotal > 0n ? Number((amount * 200n + positiveTotal) / (positiveTotal * 2n)) : 0,
  }));

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="wrap-anywhere text-title-lg text-ink">{report.file_name} 리포트</h1>
      <StatSummary totalAmount={BigInt(report.totals.totalAmount)} transactionCount={report.transaction_count}
        periodStart={report.period_start} periodEnd={report.period_end} excludedCount={report.excluded_count} />
      <p className="text-body-md text-body">{insights.summary}</p>
      <CategoryBars rows={rows} />
      <InsightList recurring={insights.recurring.map(({ transactions, note }) => ({ transactions: transactions.map(restoreTransaction), note }))}
        anomalies={insights.anomalies.map(({ transaction, reason }) => ({ transaction: restoreTransaction(transaction), reason }))} />
      <section className="rounded-xl border border-hairline bg-canvas p-6">
        <h2 className="mb-4 text-title-md text-ink">절약 제안</h2>
        <div className="grid gap-3">{insights.savingTips.map((tip, index) => <SavingTip key={index} {...tip} />)}</div>
      </section>
    </main>
  );
}
