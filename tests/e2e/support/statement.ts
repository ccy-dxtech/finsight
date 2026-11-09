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

// 카드 A와 같은 거래를 이용내역 조회 화면을 인쇄한 PDF로 만든 것(tests/fixtures/pdf/generate.mjs).
export const CARD_A_PDF_FILE_NAME = "card-a-history.pdf";

// 카드 B: 2쪽짜리 청구서형 PDF. 머리말, 다른 열 순서, 2026.11.02 날짜, '원'이 붙은 금액, 할부 열,
// 2쪽 머리행 반복, 쪽 번호, 합계 행이 들어간다. months가 있으면 할부(이번 달 결제금액 = 이용금액 / months).
export const CARD_B_PDF_FILE_NAME = "card-b-statement.pdf";

export const CARD_B_ROWS: { date: string; merchant: string; krw: number | null; months?: number }[] = [
  { date: "2026.11.02", merchant: "GS25 역삼점", krw: 3_200 },
  { date: "2026.11.03", merchant: "스타벅스 강남점", krw: 6_500 },
  { date: "2026.11.03", merchant: "넷플릭스", krw: 17_000 },
  { date: "2026.11.04", merchant: "카카오T 택시", krw: 15_400 },
  { date: "2026.11.06", merchant: "쿠팡", krw: 32_900 },
  { date: "2026.11.07", merchant: "맥도날드 역삼점", krw: 9_800 },
  { date: "2026.11.10", merchant: "삼성전자 강남점", krw: 1_290_000, months: 3 }, // 할부, 이상 지출 후보
  { date: "2026.11.14", merchant: "KT 통신요금", krw: 49_000 },
  { date: "2026.11.15", merchant: "유튜브프리미엄", krw: 14_900 },
  { date: "2026.11.16", merchant: "다이소 강남점", krw: 7_000 },
  { date: "2026.11.17", merchant: "배달의민족", krw: 24_000 },
  { date: "2026.11.18", merchant: "온누리약국 역삼점", krw: 8_700 },
  // 여기부터 2쪽
  { date: "2026.11.19", merchant: "메가박스 코엑스", krw: 28_000 },
  { date: "2026.11.20", merchant: "AMAZON.COM", krw: null }, // 원화 미확정 해외결제 → 제외
  { date: "2026.11.21", merchant: "쿠팡", krw: -32_900 }, // 11-06 쿠팡 취소
  { date: "2026.11.22", merchant: "교보문고 광화문점", krw: 21_000 },
  { date: "2026.11.24", merchant: "이디야커피 역삼점", krw: 4_500 },
  { date: "2026.11.25", merchant: "GS칼텍스 역삼주유소", krw: 60_000 },
  { date: "2026.11.27", merchant: "올리브영 강남점", krw: 18_600 },
  { date: "2026.11.28", merchant: "스타벅스 강남점", krw: 5_900 },
  { date: "2026.11.29", merchant: "쿠팡이츠", krw: 19_800 },
];
export const CARD_B_FIRST_PAGE_ROWS = 12;

// 포함 20건 합계: 3,200 + 6,500 + 17,000 + 15,400 + 32,900 + 9,800 + 1,290,000 + 49,000 + 14,900
//   + 7,000 + 24,000 + 8,700 + 28,000 − 32,900 + 21,000 + 4,500 + 60,000 + 18,600 + 5,900 + 19,800 = 1,603,300
// 할부는 이용일에 전체 금액으로 잡는다(이번 달 결제금액 430,000원이 아님).
// 2쪽 반복 머리행·쪽 번호·합계 행·안내문은 날짜가 없어 거래도 제외 건수도 아니다.
export const CARD_B_EXPECTED = {
  totalAmount: 1_603_300,
  total: "1,603,300원",
  count: "20건",
  period: "11.02–11.29",
  excluded: "1건",
};

// 날짜·가맹점·금액으로 볼 수 있는 열이 없는 CSV.
export function noColumnsCsv(): Buffer {
  return Buffer.from(["메모,내용", "장보기 목록,우유와 계란", "할 일,방 청소하기", "읽을 책,소설 한 권"].join("\r\n"), "utf8");
}
