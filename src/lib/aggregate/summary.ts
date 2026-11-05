import type { Transaction } from "@/types";

export function summarize(txns: readonly Transaction[]): {
  totalAmount: bigint;
  transactionCount: number;
  periodStart: string | null;
  periodEnd: string | null;
} {
  let totalAmount = 0n;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  for (const txn of txns) {
    totalAmount += txn.amount;
    if (periodStart === null || txn.occurredOn < periodStart) periodStart = txn.occurredOn;
    if (periodEnd === null || txn.occurredOn > periodEnd) periodEnd = txn.occurredOn;
  }

  return { totalAmount, transactionCount: txns.length, periodStart, periodEnd };
}
