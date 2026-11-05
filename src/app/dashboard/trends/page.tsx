import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getKstMonthStart } from "@/lib/plan";
import { monthlyTotals, categoryChanges } from "@/lib/aggregate";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ChangeTable } from "@/components/ChangeTable";
import { LockedPanel } from "@/components/LockedPanel";
import type { Category, Transaction } from "@/types";

export default async function Trends() {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("plan").eq("id", user.id).maybeSingle();
  if (profileError || !profile || (profile.plan !== "free" && profile.plan !== "pro")) {
    throw new Error("플랜 정보를 불러오지 못했어요.");
  }

  const transactions: Transaction[] = [];
  if (profile.plan === "pro") {
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("transactions")
        .select("occurred_on,merchant,amount::text,category").eq("user_id", user.id)
        .order("id").range(start, start + 999);
      if (error || !data) throw new Error("월별 추이를 불러오지 못했어요.");
      for (const row of data) {
        transactions.push({ id: transactions.length + 1, occurredOn: row.occurred_on,
          merchant: row.merchant, amount: BigInt(row.amount), category: row.category as Category });
      }
      if (data.length < 1000) break;
    }
  }
  const month = getKstMonthStart(new Date());
  const previous = new Date(`${month}T00:00:00Z`);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const changes = profile.plan === "pro"
    ? categoryChanges(transactions, month.slice(0, 7), previous.toISOString().slice(0, 7)) : [];

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 break-keep px-8 py-8">
      <h1 className="text-title-lg text-ink">월별 추이</h1>
      {profile.plan === "free" ? <LockedPanel /> : transactions.length === 0 ? (
        <p className="rounded-xl border border-hairline bg-canvas p-6 text-body-md text-muted">아직 저장된 거래가 없어요. 카드 명세서를 올려 월별 추이를 확인해 보세요.</p>
      ) : <><MonthlyChart rows={monthlyTotals(transactions)} /><ChangeTable rows={changes} /></>}
    </main>
  );
}
