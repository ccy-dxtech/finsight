import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionPlan } from "@/lib/supabase/session-plan";
import { getMonthlyLimit } from "@/lib/plan";
import { SettingsRow } from "@/components/SettingsRow";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DeleteDataButton } from "@/components/DeleteDataButton";

export default async function Settings() {
  const session = await getSessionPlan();
  if (!session) redirect("/login");
  const { plan, email } = session;
  const pro = plan === "pro";

  async function logout() {
    "use server";
    const client = await createServerClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error("로그아웃하지 못했어요. 다시 시도해 주세요.");
    redirect("/");
  }

  // 설정은 업그레이드를 권하는 자리가 아니라서 "프로 구독하기"도 보조 버튼이다(UX_GUIDE S6).
  const planDescription = pro
    ? `한 달에 ${getMonthlyLimit("pro")}회 분석하고 월별 추이를 볼 수 있어요. 해지해도 이번 결제 기간까지 프로가 유지되고, 저장된 거래와 리포트는 그대로예요.`
    : `한 달에 ${getMonthlyLimit("free")}회 분석할 수 있어요. 프로는 한 달에 ${getMonthlyLimit("pro")}회 분석하고 월별 추이도 볼 수 있어요.`;
  const planAction = pro
    ? <Button href="/api/portal" variant="secondary" size="md">구독 관리</Button>
    : (
      <div className="grid justify-items-start gap-1 sm:justify-items-end">
        <Button href="/api/checkout" variant="secondary" size="md">프로 구독하기</Button>
        <p className="text-caption text-muted">테스트 결제 환경이며 실제로 청구되지 않습니다</p>
      </div>
    );

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="text-title-lg text-ink">설정</h1>
      <section className="min-w-0 rounded-xl border border-hairline bg-canvas p-6">
        <SettingsRow title={<>플랜<Badge variant={pro ? "pro" : "default"}>{pro ? "프로" : "무료"}</Badge></>} description={planDescription} action={planAction} />
        <SettingsRow title="Google 계정" description={email ?? undefined} action={<form action={logout}><Button type="submit" variant="secondary" size="md">로그아웃</Button></form>} />
        <SettingsRow title="내 데이터 전체 삭제" variant="danger" description="거래와 리포트를 모두 지워요. 계정, 구독, 이번 달 사용 횟수는 그대로예요." action={<DeleteDataButton />} />
      </section>
    </main>
  );
}
