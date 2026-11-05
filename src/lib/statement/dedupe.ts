import type { Transaction } from "@/types";

export function dedupeKey(transaction: Transaction): string {
  return JSON.stringify([
    transaction.occurredOn,
    transaction.merchant,
    transaction.amount.toString(),
  ]);
}

export function pickNewTransactions(
  fileTxns: Transaction[],
  existingKeys: Set<string>,
): Transaction[] {
  return fileTxns.filter((transaction) => !existingKeys.has(dedupeKey(transaction)));
}
