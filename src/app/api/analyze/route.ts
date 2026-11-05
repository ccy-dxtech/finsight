import { createServerClient } from "@/lib/supabase/server";
import { getKstMonthStart, getMonthlyLimit } from "@/lib/plan";
import { CATEGORIES, type Category } from "@/lib/categories";
import { parseStatement, maskTopRows, normalizeRows, dedupeKey, pickNewTransactions, StatementError } from "@/lib/statement";
import { summarize, sumByCategory } from "@/lib/aggregate";
import { mapColumns, classifyMerchants, writeReport } from "@/services/claude";
import type { ReportInsights, Transaction } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const messages = {
  unauthorized: ["로그인이 필요해요.", "Google 계정으로 다시 로그인해 주세요."],
  unsupported_file: ["지원하지 않는 파일이에요.", "CSV, xls, xlsx 파일 하나를 올려 주세요. 암호가 걸린 엑셀은 지원하지 않아요."],
  file_too_large: ["파일이 5MB를 넘어요.", "5MB 이하의 파일을 올려 주세요."],
  too_many_rows: ["거래가 3,000건을 넘어요.", "기간을 나누어 파일을 올려 주세요."],
  columns_not_found: ["날짜·가맹점·금액 열을 찾지 못했어요.", "카드사에서 받은 원본 파일인지 확인해 주세요."],
  no_transactions: ["읽을 수 있는 거래가 없어요.", "날짜·가맹점·원화 금액이 있는 파일인지 확인해 주세요."],
  already_analyzed: ["이미 분석한 파일이에요.", "새 거래가 있는 파일을 올려 주세요."],
  quota_exceeded: ["이번 달 분석 횟수를 모두 사용했어요.", "플랜을 확인하거나 다음 달에 다시 이용해 주세요."],
  ai_failed: ["분석을 완료하지 못했어요.", "잠시 후 같은 파일로 다시 시도해 주세요."],
} as const;

function failure(code: keyof typeof messages, status = 400) {
  const [fact, action] = messages[code];
  return Response.json({ error: code, message: `**${fact}** ${action} 횟수는 차감되지 않았어요.` }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return failure("unauthorized", 401);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return failure("unsupported_file");
    }
    const file = form.get("file");
    const files = [...form.values()].filter((entry) => entry instanceof File);
    if (!(file instanceof File) || files.length !== 1 || !/\.(csv|xls|xlsx)$/i.test(file.name)) {
      return failure("unsupported_file");
    }
    if (file.size > 5 * 1024 * 1024) return failure("file_too_large");

    const month = getKstMonthStart(new Date());
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("plan").eq("id", user.id).maybeSingle();
    if (profileError || !profile || (profile.plan !== "free" && profile.plan !== "pro")) throw new Error();
    const plan = profile.plan;
    const { data: usage, error: usageError } = await supabase.from("usage")
      .select("count").eq("user_id", user.id).eq("month", month).maybeSingle();
    if (usageError) throw new Error();
    if ((usage?.count ?? 0) >= getMonthlyLimit(plan)) return failure("quota_exceeded", 429);

    const rows = parseStatement(await file.arrayBuffer(), file.name);
    const mapping = await mapColumns(maskTopRows(rows));
    if (!mapping) return failure("columns_not_found");
    const { transactions, excludedCount } = normalizeRows(rows, mapping);
    const summary = summarize(transactions);

    const existingKeys = new Set<string>();
    for (let start = 0; ; start += 1000) {
      // JSON 숫자 변환으로 정밀도를 잃지 않도록 bigint를 십진 문자열로 받는다.
      const { data, error } = await supabase.from("transactions")
        .select("occurred_on,merchant,amount::text").eq("user_id", user.id)
        .gte("occurred_on", summary.periodStart!).lte("occurred_on", summary.periodEnd!)
        .order("id").range(start, start + 999);
      if (error || !data) throw new Error();
      for (const row of data) existingKeys.add(dedupeKey({
        id: 0, occurredOn: row.occurred_on, merchant: row.merchant, amount: BigInt(row.amount),
      }));
      if (data.length < 1000) break;
    }
    const newTransactions = pickNewTransactions(transactions, existingKeys);
    if (newTransactions.length === 0) return failure("already_analyzed");

    const merchants = [...new Set(transactions.map((txn) => txn.merchant))];
    const batches: Promise<{ merchant: string; category: Category }[]>[] = [];
    for (let start = 0; start < merchants.length; start += 200) {
      batches.push(classifyMerchants(merchants.slice(start, start + 200)));
    }
    const categories = new Map((await Promise.all(batches)).flat().map(({ merchant, category }) => [merchant, category]));
    const classified = transactions.map((txn) => ({ ...txn, category: categories.get(txn.merchant) ?? "기타" }));
    const byId = new Map(classified.map((txn) => [txn.id, txn]));
    const categoryTotals = Object.fromEntries(CATEGORIES.map((category) => [category, 0n])) as Record<Category, bigint>;
    for (const { category, total } of sumByCategory(classified)) categoryTotals[category] = total;
    const draft = await writeReport({ plan, categoryTotals, transactions: classified.map((txn) => ({
      id: txn.id, date: txn.occurredOn, merchant: txn.merchant, amount: txn.amount, category: txn.category,
    })) });
    const insights: ReportInsights = {
      summary: draft.summary,
      recurring: draft.recurring.filter((item) => item.transactionIds.every((id) => byId.has(id)))
        .map((item) => ({ transactions: item.transactionIds.map((id) => byId.get(id)!), note: item.note })),
      anomalies: draft.anomalies.filter((item) => byId.has(item.transactionId))
        .map((item) => ({ transaction: byId.get(item.transactionId)!, reason: item.reason })),
      savingTips: draft.savingTips,
    };
    // RPC의 JSON 경계에서만 bigint를 문자열로 바꿔 정밀도를 보존한다.
    const payload = JSON.parse(JSON.stringify({
      p_month: month,
      p_report: {
        file_name: file.name, period_start: summary.periodStart, period_end: summary.periodEnd,
        transaction_count: summary.transactionCount, excluded_count: excludedCount,
        totals: { totalAmount: summary.totalAmount, categoryTotals }, insights,
      },
      p_transactions: newTransactions.map((txn: Transaction) => ({
        occurred_on: txn.occurredOn, merchant: txn.merchant, amount: txn.amount, category: categories.get(txn.merchant) ?? "기타",
      })),
    }, (_key, value) => typeof value === "bigint" ? value.toString() : value));
    const { data: reportId, error } = await supabase.rpc("commit_analysis", payload);
    if (error || !reportId) throw new Error();
    return Response.json({ reportId });
  } catch (error) {
    if (error instanceof StatementError) return failure(error.code);
    // 외부 오류에는 거래나 원본이 포함될 수 있어 로그에 남기지 않는다.
    return failure("ai_failed", 500);
  }
}
