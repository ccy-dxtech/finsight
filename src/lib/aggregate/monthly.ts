import { CATEGORIES, type Category } from "@/lib/categories";
import type { Transaction } from "@/types";

export function monthlyTotals(txns: readonly Transaction[]): {
  month: string; total: bigint;
}[] {
  const totals = new Map<string, bigint>();
  for (const txn of txns) {
    const month = txn.occurredOn.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0n) + txn.amount);
  }

  return [...totals].sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12).map(([month, total]) => ({ month, total }));
}

export function categoryChanges(
  txns: readonly Transaction[], thisMonth: string, lastMonth: string,
): { category: Category; last: bigint; current: bigint; diff: bigint }[] {
  const totals = new Map<Category, { last: bigint; current: bigint }>();
  for (const txn of txns) {
    const month = txn.occurredOn.slice(0, 7);
    if (month !== thisMonth && month !== lastMonth) continue;

    const category = txn.category ?? "기타";
    const values = totals.get(category) ?? { last: 0n, current: 0n };
    if (month === lastMonth) values.last += txn.amount;
    if (month === thisMonth) values.current += txn.amount;
    totals.set(category, values);
  }

  return CATEGORIES.filter((category) => totals.has(category)).map((category) => {
    const { last, current } = totals.get(category)!;
    return { category, last, current, diff: current - last };
  });
}

// 명세서는 달이 끝난 뒤에 받으므로 오늘 날짜가 아니라 거래가 있는 가장 최근 달을 기준으로 삼는다.
export function latestMonthChanges(txns: readonly Transaction[]): {
  currentMonth: string; previousMonth: string; rows: ReturnType<typeof categoryChanges>;
} | null {
  if (txns.length === 0) return null;

  const currentMonth = txns.reduce((latest, txn) => {
    const month = txn.occurredOn.slice(0, 7);
    return month > latest ? month : latest;
  }, "");
  const [year, month] = currentMonth.split("-").map(Number);
  const previousMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  // 전달 거래가 없으면 모든 카테고리가 0원 대비 증가로 보이므로 비교하지 않는다.
  const hasPrevious = txns.some((txn) => txn.occurredOn.startsWith(previousMonth));

  return { currentMonth, previousMonth, rows: hasPrevious ? categoryChanges(txns, currentMonth, previousMonth) : [] };
}
