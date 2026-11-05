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
