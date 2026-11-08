// 금액은 bigint로 통일해 원 단위 정수와 합계의 정밀도를 보장하고 소수 금액을 허용하지 않는다.
import type { Category } from "@/lib/categories";

export type { Category } from "@/lib/categories";

export type Plan = "free" | "pro";

export interface Transaction {
  id: number; // 요청 내 임시 ID: 파일의 행 번호(1부터 시작), DB ID와 무관
  occurredOn: string; // YYYY-MM-DD
  merchant: string;
  amount: bigint;
  category?: Category;
}

export interface ReportTotals {
  totalAmount: bigint;
  categoryTotals: Record<Category, bigint>;
}

// AI는 요청 내 임시 거래 ID와 해석 문장만 반환한다.
export interface AIReportResponse {
  summary: string;
  recurring: { transactionIds: number[]; note: string }[];
  anomalies: { transactionId: number; reason: string }[];
  savingTips: { title: string; detail: string }[];
}

export interface ReportInsights {
  summary: string;
  recurring: { transactions: Transaction[]; note: string }[];
  anomalies: { transaction: Transaction; reason: string }[];
  savingTips: { title: string; detail: string }[];
}

// reports 행의 jsonb 모양: commit_analysis RPC로 넘길 때 bigint를 문자열로 바꿔 정밀도를 지킨다.
export type StoredTransaction = Omit<Transaction, "amount"> & { amount: string };

export interface StoredReportTotals {
  totalAmount: string;
  categoryTotals: Record<Category, string>;
}

export interface StoredReportInsights extends Omit<ReportInsights, "recurring" | "anomalies"> {
  recurring: { transactions: StoredTransaction[]; note: string }[];
  anomalies: { transaction: StoredTransaction; reason: string }[];
}

export interface Report {
  id: string;
  userId: string;
  fileName: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  transactionCount: number;
  excludedCount: number;
  totals: ReportTotals;
  insights: ReportInsights;
  createdAt: string;
}
