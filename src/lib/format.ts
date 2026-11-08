const won = new Intl.NumberFormat("ko-KR");
const date = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
});

export function formatNumber(amount: bigint): string {
  return won.format(amount);
}

export function formatAmount(amount: bigint): string {
  return `${formatNumber(amount)}원`;
}

export function formatDate(value: string): string {
  const parts = date.formatToParts(new Date(value));
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join(".");
}

export function formatMonth(month: string): string {
  return `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;
}

export function formatPeriod(start: string, end: string): string {
  return `${formatDate(start).slice(5)}–${formatDate(end).slice(5)}`;
}
