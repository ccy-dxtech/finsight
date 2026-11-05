import { CATEGORIES, type Category } from "@/lib/categories";
import type { Transaction } from "@/types";

export function sumByCategory(txns: readonly Transaction[]): {
  category: Category; total: bigint; ratio: number;
}[] {
  const totals = new Map<Category, bigint>();
  for (const txn of txns) {
    const category = txn.category ?? "기타";
    totals.set(category, (totals.get(category) ?? 0n) + txn.amount);
  }

  const positiveTotal = [...totals.values()].reduce(
    (sum, total) => sum + (total > 0n ? total : 0n), 0n,
  );

  return CATEGORIES.map((category) => {
    const total = totals.get(category) ?? 0n;
    // 금액을 Number로 바꾸지 않고 정수 연산으로 반올림한 비율만 변환한다.
    const ratio = total > 0n && positiveTotal > 0n
      ? Number((total * 200n + positiveTotal) / (positiveTotal * 2n))
      : 0;
    return { category, total, ratio };
  }).filter(({ total }) => total !== 0n)
    .sort((a, b) => a.total > b.total ? -1 : a.total < b.total ? 1 : 0);
}
