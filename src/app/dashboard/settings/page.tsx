import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionPlan } from "@/lib/supabase/session-plan";
import { SettingsRow } from "@/components/SettingsRow";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DeleteDataButton } from "@/components/DeleteDataButton";

export default async function Settings() {
  const session = await getSessionPlan();
  if (!session) redirect("/login");
  const { plan } = session;

  async function logout() {
    "use server";
    const client = await createServerClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error("로그아웃하지 못했어요. 다시 시도해 주세요.");
    redirect("/");
  }

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="text-title-lg text-ink">설정</h1>
      <section className="min-w-0 rounded-xl border border-hairline bg-canvas p-6">
        <SettingsRow title="플랜" description="현재 이용 중인 플랜이에요." action={<Badge variant={plan === "pro" ? "pro" : "default"}>{plan === "pro" ? "프로" : "무료"}</Badge>} />
        {plan === "pro" &&<SettingsRow title="구독 관리" description="Polar에서 구독 해지와 결제 수단 변경을 할 수 있어요." action={<Button href="/api/portal" variant="secondary" size="md">구독 관리</Button>} />}
        <SettingsRow title="내 데이터 전체 삭제" variant="danger" description="거래와 리포트를 모두 지워요. 계정, 구독, 이번 달 사용 횟수는 그대로예요." action={<DeleteDataButton />} />
        <SettingsRow title="로그아웃" action={<form action={logout}><Button type="submit" variant="secondary" size="md">로그아웃</Button></form>} />
      </section>
    </main>
  );
}
