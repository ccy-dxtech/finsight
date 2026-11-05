const won = new Intl.NumberFormat("ko-KR");
const date = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
});

export function formatAmount(amount: bigint): string {
  return `${won.format(amount)}원`;
}

export function formatDate(value: string): string {
  const parts = date.formatToParts(new Date(value));
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join(".");
}

export function formatPeriod(start: string, end: string): string {
  return `${formatDate(start).slice(5)}–${formatDate(end).slice(5)}`;
}
