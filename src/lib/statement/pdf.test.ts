import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readPdfRows, textItemsToRows } from "./pdf";
import {
  CARD_A_ROWS, CARD_B_FIRST_PAGE_ROWS, CARD_B_ROWS,
} from "../../../tests/e2e/support/statement";

// x, 너비로 글자 조각을 만든다. 글자 크기는 10pt, y는 아래에서 위로 커진다(PDF 좌표).
const item = (str: string, x: number, width: number, y: number) => ({ str, x, y, width, fontSize: 10 });

function fixture(name: string): ArrayBuffer {
  const bytes = readFileSync(new URL(`../../../tests/fixtures/pdf/${name}`, import.meta.url));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe("textItemsToRows", () => {
  it("공백 조각을 버리고 위에서 아래로 줄을, 왼쪽에서 오른쪽으로 칸을 만든다", () => {
    const page = [
      item("6,500", 195, 25, 80), item("강남점", 143, 25, 80), item("스타벅스", 100, 40, 80.3),
      item("2026-10-01", 5, 40, 80), item(" ", 30, 70, 100), item("금액", 200, 20, 100),
      item("가맹점", 100, 30, 100), item("날짜", 10, 20, 100),
    ];
    expect(textItemsToRows([page])).toEqual([
      ["날짜", "가맹점", "금액"],
      ["2026-10-01", "스타벅스 강남점", "6,500"],
    ]);
  });

  it("가운데 정렬 머리글과 오른쪽 정렬 숫자가 겹치지 않아도 한 열로 묶고, 빈 칸은 빈 문자열로 둔다", () => {
    const page = [
      item("날짜", 10, 20, 100), item("가맹점", 100, 30, 100), item("금액", 200, 20, 100), item("해외", 300, 20, 100),
      item("2026-10-01", 5, 40, 80), item("가게", 100, 20, 80), item("6,500", 230, 25, 80),
      item("2026-10-02", 5, 40, 60), item("AMAZON", 100, 40, 60), item("29.99", 330, 20, 60),
    ];
    expect(textItemsToRows([page])).toEqual([
      ["날짜", "가맹점", "금액", "해외"],
      ["2026-10-01", "가게", "6,500", ""],
      ["2026-10-02", "AMAZON", "", "29.99"],
    ]);
  });

  it("표 밖의 제목·쪽 번호도 가장 가까운 열에 넣어 모든 행의 칸 수를 맞춘다", () => {
    const page = [
      item("카드 명세서", 5, 60, 140),
      item("날짜", 10, 20, 100), item("가맹점", 100, 30, 100), item("금액", 200, 20, 100),
      item("2026-10-01", 5, 40, 80), item("가게", 100, 20, 80), item("6,500", 195, 25, 80),
      item("1 / 1", 185, 10, 10),
    ];
    expect(textItemsToRows([page])).toEqual([
      ["카드 명세서", "", ""],
      ["날짜", "가맹점", "금액"],
      ["2026-10-01", "가게", "6,500"],
      ["", "", "1 / 1"],
    ]);
  });

  it("쪽마다 열 위치를 따로 구하고 쪽 순서대로 이어 붙인다", () => {
    const first = [item("날짜", 10, 20, 100), item("금액", 100, 20, 100), item("2026-10-01", 5, 40, 80), item("1,000", 95, 25, 80)];
    const second = [item("날짜", 10, 20, 100), item("금액", 150, 20, 100), item("2026-10-02", 5, 40, 80), item("2,000", 145, 25, 80)];
    expect(textItemsToRows([first, second])).toEqual([
      ["날짜", "금액"], ["2026-10-01", "1,000"],
      ["날짜", "금액"], ["2026-10-02", "2,000"],
    ]);
  });

  it("칸이 둘 이상인 줄이 없는 쪽은 줄마다 한 칸으로 둔다", () => {
    expect(textItemsToRows([[item("안내", 5, 20, 100), item("문구", 30, 20, 100), item("1 / 1", 50, 10, 10)]]))
      .toEqual([["안내 문구"], ["1 / 1"]]);
  });
});

describe("readPdfRows", () => {
  it("A(이용내역형, 1쪽)를 머리행과 카드 A 거래 행으로 읽는다", async () => {
    expect(await readPdfRows(fixture("card-a-history.pdf"))).toEqual([
      ["이용일자", "카드번호", "승인번호", "이용가맹점", "이용금액", "해외이용금액(USD)"],
      ...CARD_A_ROWS.map((row, index) => [
        row.date, "1234-****-****-5678", String(30_000_001 + index), row.merchant,
        row.krw === null ? "" : row.krw.toLocaleString("en-US"), row.usd ?? "",
      ]),
    ]);
  });

  it("B(청구서형, 2쪽)를 쪽마다 열을 맞춰 읽고 머리말·반복 머리행·합계·쪽 번호도 행으로 남긴다", async () => {
    const rows = await readPdfRows(fixture("card-b-statement.pdf"));
    const header = ["이용하신 곳", "이용일", "이용금액", "할부", "이번 달 결제금액"];
    const won = (amount: number) => `${amount.toLocaleString("en-US")}원`;
    const dataRows = CARD_B_ROWS.map((row) => [
      row.merchant, row.date, row.krw === null ? "" : won(row.krw),
      row.krw === null ? "해외" : row.months ? `${row.months}개월` : "일시",
      row.krw === null ? "" : won(row.months ? row.krw / row.months : row.krw),
    ]);

    expect(rows.every((row) => row.length === 5)).toBe(true);
    expect(rows.slice(0, 3).map((row) => row.filter(Boolean).join(" "))).toEqual([
      "2026년 11월 이용대금 명세서", "홍길동 님 결제일 2026.12.14", "이번 달 결제하실 금액 743,300원",
    ]);
    expect(rows[3]).toEqual(header);
    expect(rows.slice(4, 4 + CARD_B_FIRST_PAGE_ROWS)).toEqual(dataRows.slice(0, CARD_B_FIRST_PAGE_ROWS));
    const secondHeader = rows.findIndex((row, index) => index > 3 && row.join() === header.join());
    expect(rows.slice(4 + CARD_B_FIRST_PAGE_ROWS, secondHeader).map((row) => row.join("").trim())).toEqual(["1 / 2"]);
    expect(rows.slice(secondHeader + 1, secondHeader + 1 + dataRows.length - CARD_B_FIRST_PAGE_ROWS))
      .toEqual(dataRows.slice(CARD_B_FIRST_PAGE_ROWS));
    expect(rows.slice(secondHeader + 1 + dataRows.length - CARD_B_FIRST_PAGE_ROWS)).toEqual([
      ["합계", "", "1,603,300원", "", "743,300원"],
      expect.arrayContaining(["※ 해외 이용 원화 금액은 매입이 확정된 뒤 청구돼요."]),
      expect.arrayContaining(["2 / 2"]),
    ]);
  });

  it("글자가 없는 PDF(스캔본 등)는 빈 행 목록을 돌려준다", async () => {
    const empty = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
      + "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
    expect(await readPdfRows(new TextEncoder().encode(empty).buffer)).toEqual([]);
  });
});
