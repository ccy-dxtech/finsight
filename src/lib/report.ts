import type {
  Category, ReportInsights, ReportTotals, StoredReportInsights, StoredReportTotals, StoredTransaction, Transaction,
} from "@/types";

export function restoreTotals(stored: StoredReportTotals): ReportTotals {
  return {
    totalAmount: BigInt(stored.totalAmount),
    categoryTotals: Object.fromEntries(Object.entries(stored.categoryTotals)
      .map(([category, amount]) => [category, BigInt(amount)])) as Record<Category, bigint>,
  };
}

function restoreTransaction(transaction: StoredTransaction): Transaction {
  return { ...transaction, amount: BigInt(transaction.amount) };
}

export function restoreInsights(stored: StoredReportInsights): ReportInsights {
  return {
    ...stored,
    recurring: stored.recurring.map(({ transactions, note }) => ({ transactions: transactions.map(restoreTransaction), note })),
    anomalies: stored.anomalies.map(({ transaction, reason }) => ({ transaction: restoreTransaction(transaction), reason })),
  };
}
