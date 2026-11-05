import { SSF } from "xlsx";
import type { Transaction } from "@/types";
import { StatementError } from "./parse";

interface ColumnMapping {
  headerRowIndex: number;
  dateCol: number;
  merchantCol: number;
  amountCol: number;
}

function normalizeDate(value: string): string | null {
  const text = value.trim();
  const parts = text.match(/^(\d{4})([-./])(\d{1,2})\2(\d{1,2})$/)
    ?? text.match(/^(\d{4})()(\d{2})(\d{2})$/);
  let year: number;
  let month: number;
  let day: number;

  if (parts) {
    year = Number(parts[1]);
    month = Number(parts[3]);
    day = Number(parts[4]);
  } else if (/^\d+(?:\.\d+)?$/.test(text)) {
    const date = SSF.parse_date_code(Number(text));
    if (!date) return null;
    year = date.y;
    month = date.m;
    day = date.d;
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || year > 9999 || date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeAmount(value: string): bigint | null {
  const text = value.trim().replace(/원$/, "").trim().replace(/,/g, "");
  return /^[+-]?\d+$/.test(text) ? BigInt(text) : null;
}

export function normalizeRows(rows: string[][], mapping: ColumnMapping): {
  transactions: Transaction[];
  excludedCount: number;
} {
  const transactions: Transaction[] = [];
  let excludedCount = 0;

  for (let i = mapping.headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const occurredOn = normalizeDate(row[mapping.dateCol] ?? "");
    const merchant = (row[mapping.merchantCol] ?? "").trim();
    const amount = normalizeAmount(row[mapping.amountCol] ?? "");

    if (!occurredOn || !merchant || amount === null) {
      excludedCount++;
      continue;
    }

    transactions.push({ id: i + 1, occurredOn, merchant, amount });
    if (transactions.length > 3000) throw new StatementError("too_many_rows");
  }

  if (transactions.length === 0) throw new StatementError("no_transactions");
  return { transactions, excludedCount };
}
