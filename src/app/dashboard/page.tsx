import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionPlan } from "@/lib/supabase/session-plan";
import { getKstMonthStart, getMonthlyLimit } from "@/lib/plan";
import { UploadDropzone } from "@/components/UploadDropzone";
import { LockedPanel } from "@/components/LockedPanel";
import { UsageMeter } from "@/components/UsageMeter";
import { ReportListItem } from "@/components/ReportListItem";
import { Notice } from "@/components/Notice";
import { Button } from "@/components/Button";

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
  const { checkout } = await searchParams;

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="text-title-lg text-ink">대시보드</h1>
      {checkout === "success" && (session.plan === "pro"
        ? <Notice variant="success"><strong>프로 구독을 시작했어요.</strong> 이제 월별 추이를 볼 수 있어요.<div><Button variant="text" href="/dashboard/trends">월별 추이 보기</Button></div></Notice>
        : <Notice><strong>결제 확인 중이에요.</strong> 잠시 뒤 새로고침해 주세요. 결제가 확인되면 프로 플랜으로 표시돼요.</Notice>)}
      {used >= limit ? <LockedPanel reason="quota" plan={session.plan} /> : <UploadDropzone />}
      <UsageMeter used={used} limit={limit} />
      <section className="rounded-xl border border-hairline bg-canvas p-6">
        <h2 className="mb-4 text-title-md text-ink">최근 리포트</h2>
        {reportsResult.data?.length ? <ul>{reportsResult.data.map((report) => (
          <ReportListItem key={report.id} id={report.id} fileName={report.file_name}
            periodStart={report.period_start} periodEnd={report.period_end}
            totalAmount={BigInt(report.totals.totalAmount)} createdAt={report.created_at} />
        ))}</ul> : <p className="text-body-md text-muted">아직 리포트가 없어요. 카드 명세서를 올려 첫 리포트를 만들어 보세요.</p>}
      </section>
    </main>
  );
}
