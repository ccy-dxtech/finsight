import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionPlan } from "@/lib/supabase/session-plan";
import { monthlyTotals, latestMonthChanges } from "@/lib/aggregate";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ChangeTable } from "@/components/ChangeTable";
import { LockedPanel } from "@/components/LockedPanel";
import { Button } from "@/components/Button";
import type { Category, Transaction } from "@/types";

const PAGE_SIZE = 1000;

export default async function Trends() {
  const session = await getSessionPlan();
  if (!session) redirect("/login");

  const transactions: Transaction[] = [];
  if (session.plan === "pro") {
    const supabase = await createServerClient();
    // 오프셋 대신 마지막 id 다음부터 읽어, 읽는 사이에 거래가 저장돼도 중복·누락이 없게 한다.
    let lastId: string | null = null;
    for (;;) {
      let query = supabase.from("transactions")
        .select("id,occurred_on,merchant,amount::text,category").eq("user_id", session.userId);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query.order("id").limit(PAGE_SIZE);
      if (error || !data) throw new Error("월별 추이를 불러오지 못했어요.");
      for (const row of data) {
        transactions.push({ id: transactions.length + 1, occurredOn: row.occurred_on,
          merchant: row.merchant, amount: BigInt(row.amount), category: row.category as Category });
      }
      if (data.length < PAGE_SIZE) break;
      lastId = data[data.length - 1].id;
    }
  }
  const comparison = latestMonthChanges(transactions);

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="text-title-lg text-ink">월별 추이</h1>
      {session.plan === "free" ? <LockedPanel /> : !comparison ? (
        <section className="grid justify-items-start gap-3 rounded-xl border border-hairline bg-canvas p-6">
          <p className="text-body-md text-muted">아직 저장된 거래가 없어요. 카드 명세서를 올려 월별 추이를 확인해 보세요.</p>
          <Button href="/dashboard" variant="primary" size="md">명세서 올리기</Button>
        </section>
      ) : <><MonthlyChart rows={monthlyTotals(transactions)} /><ChangeTable {...comparison} /></>}
    </main>
  );
}
