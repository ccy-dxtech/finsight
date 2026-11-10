import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionPlan } from "@/lib/supabase/session-plan";
import { getKstMonthStart, getMonthlyLimit } from "@/lib/plan";
import { rankCategoryTotals } from "@/lib/aggregate";
import { formatPeriod } from "@/lib/format";
import { restoreTotals } from "@/lib/report";
import { UploadDropzone } from "@/components/UploadDropzone";
import { LockedPanel } from "@/components/LockedPanel";
import { UsageMeter } from "@/components/UsageMeter";
import { SettingsRow } from "@/components/SettingsRow";
import { CategoryBars } from "@/components/CategoryBars";
import { ReportListItem } from "@/components/ReportListItem";
import { Notice } from "@/components/Notice";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import type { StoredReportTotals } from "@/types";

export default async function Dashboard({ searchParams }: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await getSessionPlan();
  if (!session) redirect("/login");
  const supabase = await createServerClient();
  const month = getKstMonthStart(new Date());
  const [usageResult, reportsResult] = await Promise.all([
    supabase.from("usage").select("count").eq("user_id", session.userId).eq("month", month).maybeSingle(),
    supabase.from("reports").select("id,file_name,period_start,period_end,totals,created_at")
      .eq("user_id", session.userId).order("created_at", { ascending: false }),
  ]);
  if (usageResult.error || reportsResult.error) throw new Error("대시보드를 불러오지 못했어요.");
  const limit = getMonthlyLimit(session.plan);
  const used = usageResult.data?.count ?? 0;
  const exhausted = used >= limit;
  const pro = session.plan === "pro";
  const { checkout } = await searchParams;
  const reports = reportsResult.data ?? [];
  const latest = reports[0];
  const categoryRows = latest
    ? rankCategoryTotals(restoreTotals(latest.totals as StoredReportTotals).categoryTotals)
      .map(({ category, total, ratio }) => ({ label: category, amount: total, ratio }))
    : [];
  const priceLabel = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "월 1,000원";

  // 업로드 영역의 "분석하기"가 이 화면의 초록 버튼이라, 플랜 카드의 "프로 구독하기"는 보조 버튼이다.
  // 무료가 횟수를 다 쓰면 소진 카드가 결제 버튼을 이미 보여주므로 플랜 카드를 두지 않는다.
  const planCard = !(exhausted && !pro) && (
    <section className="min-w-0 rounded-xl border border-hairline bg-canvas px-6 py-2">
      <SettingsRow
        title={<>플랜<Badge variant={pro ? "pro" : "default"}>{pro ? "프로" : "무료"}</Badge></>}
        description={pro
          ? `한 달에 ${getMonthlyLimit("pro")}회 분석하고 월별 추이를 볼 수 있어요.`
          : `한 달에 ${getMonthlyLimit("free")}회 분석할 수 있어요. 프로는 ${priceLabel}에 한 달 ${getMonthlyLimit("pro")}회 분석하고 월별 추이도 볼 수 있어요.`}
        action={pro
          ? <Button href="/dashboard/trends" variant="secondary" size="md">월별 추이 보기</Button>
          : (
            <div className="grid justify-items-start gap-1 sm:justify-items-end">
              <Button href="/api/checkout" variant="secondary" size="md">프로 구독하기</Button>
              <p className="text-caption text-muted">테스트 결제 환경이며 실제로 청구되지 않습니다</p>
            </div>
          )}
      />
    </section>
  );

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="text-title-lg text-ink">대시보드</h1>
      {checkout === "success" && (pro
        ? <Notice variant="success"><strong>프로 구독을 시작했어요.</strong> 이제 월별 추이를 볼 수 있어요.<div><Button variant="text" href="/dashboard/trends">월별 추이 보기</Button></div></Notice>
        : <Notice><strong>결제 확인 중이에요.</strong> 잠시 뒤 새로고침해 주세요. 결제가 확인되면 프로 플랜으로 표시돼요.</Notice>)}
      {exhausted ? <LockedPanel reason="quota" plan={session.plan} /> : <UploadDropzone />}
      <UsageMeter used={used} limit={limit} />
      {planCard}
      {latest
        ? <CategoryBars rows={categoryRows} caption={<>
            가장 최근 리포트 · <span className="wrap-anywhere">{latest.file_name}</span> · {formatPeriod(latest.period_start, latest.period_end)}{" "}
            <Button variant="text" href={`/dashboard/reports/${latest.id}`}>리포트 보기</Button>
          </>} />
        : (
          <section className="rounded-xl border border-hairline bg-canvas p-6">
            <h2 className="mb-2 text-title-md text-ink">카테고리별 지출</h2>
            <p className="text-body-md text-muted">명세서를 분석하면 카테고리별 지출이 여기에 보여요.</p>
          </section>
        )}
      <section className="rounded-xl border border-hairline bg-canvas p-6">
        <h2 className="mb-4 text-title-md text-ink">최근 리포트</h2>
        {reports.length ? <ul>{reports.map((report) => (
          <ReportListItem key={report.id} id={report.id} fileName={report.file_name}
            periodStart={report.period_start} periodEnd={report.period_end}
            totalAmount={BigInt(report.totals.totalAmount)} createdAt={report.created_at} />
        ))}</ul> : <p className="text-body-md text-muted">아직 리포트가 없어요. 카드 명세서를 올려 첫 리포트를 만들어 보세요.</p>}
      </section>
    </main>
  );
}
