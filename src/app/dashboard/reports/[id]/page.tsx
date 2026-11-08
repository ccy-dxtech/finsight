import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { rankCategoryTotals } from "@/lib/aggregate";
import { restoreInsights, restoreTotals } from "@/lib/report";
import { StatSummary } from "@/components/StatSummary";
import { CategoryBars } from "@/components/CategoryBars";
import { InsightList } from "@/components/InsightList";
import { SavingTip } from "@/components/SavingTip";
import type { StoredReportInsights, StoredReportTotals } from "@/types";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: report, error } = await supabase.from("reports")
    .select("file_name,period_start,period_end,transaction_count,excluded_count,totals,insights")
    .eq("id", id).maybeSingle();
  if (error?.code === "22P02") notFound();
  if (error) throw new Error("리포트를 불러오지 못했어요.");
  if (!report) notFound();

  const totals = restoreTotals(report.totals as StoredReportTotals);
  const insights = restoreInsights(report.insights as StoredReportInsights);
  const rows = rankCategoryTotals(totals.categoryTotals)
    .map(({ category, total, ratio }) => ({ label: category, amount: total, ratio }));

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="wrap-anywhere text-title-lg text-ink">{report.file_name} 리포트</h1>
      <StatSummary totalAmount={totals.totalAmount} transactionCount={report.transaction_count}
        periodStart={report.period_start} periodEnd={report.period_end} excludedCount={report.excluded_count} />
      <p className="text-body-md text-body">{insights.summary}</p>
      <CategoryBars rows={rows} />
      <InsightList recurring={insights.recurring} anomalies={insights.anomalies} />
      <section className="rounded-xl border border-hairline bg-canvas p-6">
        <h2 className="mb-4 text-title-md text-ink">절약 제안</h2>
        <div className="grid gap-3">{insights.savingTips.map((tip, index) => <SavingTip key={index} {...tip} />)}</div>
      </section>
    </main>
  );
}
