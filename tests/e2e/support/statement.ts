// 업로드용 테스트 명세서. 기대값은 앱 코드가 아니라 아래 행에서 손으로 계산해 적었다.
type Row = { date: string; merchant: string; krw: number | null; usd?: string };

export const CARD_A_FILE_NAME = "e2e-card-a-2026-10.csv";

export const CARD_A_ROWS: Row[] = [
  { date: "2026-10-01", merchant: "스타벅스 강남점", krw: 6_500 },
  { date: "2026-10-02", merchant: "GS25 역삼점", krw: 3_200 },
  { date: "2026-10-03", merchant: "넷플릭스", krw: 17_000 },
  { date: "2026-10-05", merchant: "쿠팡", krw: 45_900 },
  { date: "2026-10-07", merchant: "카카오T 택시", krw: 12_300 },
  { date: "2026-10-08", merchant: "김밥천국 역삼점", krw: 8_000 },
  { date: "2026-10-10", merchant: "이마트 역삼점", krw: 67_400 },
  { date: "2026-10-12", merchant: "스타벅스 강남점", krw: 5_900 },
  { date: "2026-10-14", merchant: "SK텔레콤 통신요금", krw: 55_000 },
  { date: "2026-10-15", merchant: "유튜브프리미엄", krw: 14_900 },
  { date: "2026-10-17", merchant: "CGV 강남", krw: 15_000 },
  { date: "2026-10-18", merchant: "쿠팡", krw: -45_900 }, // 10-05 쿠팡 취소
  { date: "2026-10-20", merchant: "올리브영 강남점", krw: 32_000 },
  { date: "2026-10-21", merchant: "연세내과의원", krw: 23_400 },
  { date: "2026-10-23", merchant: "배달의민족", krw: 28_500 },
  { date: "2026-10-25", merchant: "교보문고 강남점", krw: 18_000 },
  { date: "2026-10-27", merchant: "롯데하이마트 강남점", krw: 1_290_000 }, // 이상 지출 후보
  { date: "2026-10-28", merchant: "티머니 교통카드 충전", krw: 50_000 },
  // 원화 금액이 빈 해외결제 2건 → 제외
  { date: "2026-10-29", merchant: "AMAZON.COM", krw: null, usd: "29.99" },
  { date: "2026-10-30", merchant: "APPLE.COM/BILL", krw: null, usd: "9.99" },
];

// 포함 18건 합계: 6,500 + 3,200 + 17,000 + 45,900 + 12,300 + 8,000 + 67,400 + 5,900 + 55,000
//   + 14,900 + 15,000 − 45,900 + 32,000 + 23,400 + 28,500 + 18,000 + 1,290,000 + 50,000 = 1,647,100
// 기간은 제외 행을 빼고 10-01 ~ 10-28.
export const CARD_A_EXPECTED = {
  totalAmount: 1_647_100,
  total: "1,647,100원",
  count: "18건",
  period: "10.01–10.28",
  excluded: "2건",
};

// 카드사 내려받기 형식을 흉내 낸다: 카드번호(마스킹)·승인번호(8자리) 같은 버려야 할 열 포함.
export function statementCsv(rows: Row[]): Buffer {
  const header = "이용일자,카드번호,승인번호,이용가맹점,이용금액,해외이용금액(USD)";
  const lines = rows.map((row, index) => [
    row.date,
    "1234-****-****-5678",
    String(30_000_001 + index),
    row.merchant,
    row.krw === null ? "" : `"${row.krw.toLocaleString("en-US")}"`,
    row.usd ?? "",
  ].join(","));
  return Buffer.from([header, ...lines].join("\r\n") + "\r\n", "utf8");
}

// 날짜·가맹점·금액으로 볼 수 있는 열이 없는 CSV.
export function noColumnsCsv(): Buffer {
  return Buffer.from(["메모,내용", "장보기 목록,우유와 계란", "할 일,방 청소하기", "읽을 책,소설 한 권"].join("\r\n"), "utf8");
}
