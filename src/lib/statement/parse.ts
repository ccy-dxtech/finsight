import * as XLSX from "xlsx";
import { decodeCsv } from "./decode";

type StatementErrorCode = "unsupported_file" | "too_many_rows" | "no_transactions";

export class StatementError extends Error {
  constructor(public readonly code: StatementErrorCode) {
    super(code);
    this.name = "StatementError";
  }
}

export function parseStatement(buffer: ArrayBuffer, fileName: string): string[][] {
  const extension = fileName.match(/\.(csv|xls|xlsx)$/i)?.[1].toLowerCase();
  if (!extension) throw new StatementError("unsupported_file");

  try {
    const workbook = extension === "csv"
      ? XLSX.read(decodeCsv(buffer), { type: "string", raw: true })
      : XLSX.read(buffer, { type: "array", dateNF: "yyyy-mm-dd" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
      range: 0,
    });
  } catch {
    // 파서의 오류 메시지에 원본 데이터가 포함되지 않도록 코드만 반환한다.
    throw new StatementError("unsupported_file");
  }
}
