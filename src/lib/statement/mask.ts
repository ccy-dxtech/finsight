export function maskTopRows(rows: string[][], n = 10): string[][] {
  return rows.slice(0, n).map((row) =>
    row.map((cell) => cell.replace(/\d{6,}/g, (digits) => "*".repeat(digits.length))),
  );
}
