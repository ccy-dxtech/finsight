// 테스트용 카드 명세서 PDF 두 개를 만든다. 실행: node tests/fixtures/pdf/generate.mjs
// 카드사 웹의 이용내역·청구서를 브라우저에서 "PDF로 저장"한 것처럼 설치된 Chrome으로 HTML 표를 인쇄한다.
// 거래와 기대값은 tests/e2e/support/statement.ts 한 곳에 있다(Node 24가 .ts의 타입만 지우고 읽는다).
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import {
  CARD_A_PDF_FILE_NAME, CARD_A_ROWS, CARD_B_FIRST_PAGE_ROWS, CARD_B_PDF_FILE_NAME, CARD_B_ROWS,
} from "../../e2e/support/statement.ts";

const font = readFileSync(new URL("../../../node_modules/pretendard/dist/public/static/Pretendard-Regular.otf", import.meta.url));
const won = (amount) => amount.toLocaleString("en-US");
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const style = `
  @font-face { font-family: Pretendard; src: url(data:font/otf;base64,${font.toString("base64")}) format("opentype"); }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10px/1.4 Pretendard; color: #111; }
  h1 { margin: 0 0 8px; font-size: 16px; font-weight: normal; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 4px 8px; border: 0.5px solid #999; white-space: nowrap; }
  th { background: #eee; font-weight: normal; text-align: center; }
  .center { text-align: center; }
  .num { text-align: right; }
`;

// A: 이용내역 조회형. 1쪽, 표가 맨 위에서 바로 시작하고 카드 A CSV와 같은 열을 쓴다.
const cardA = `
  <table>
    <thead><tr><th>이용일자</th><th>카드번호</th><th>승인번호</th><th>이용가맹점</th><th>이용금액</th><th>해외이용금액(USD)</th></tr></thead>
    <tbody>${CARD_A_ROWS.map((row, index) => `<tr>
      <td class="center">${row.date}</td><td class="center">1234-****-****-5678</td><td class="center">${30_000_001 + index}</td>
      <td>${escape(row.merchant)}</td><td class="num">${row.krw === null ? "" : won(row.krw)}</td><td class="num">${row.usd ?? ""}</td>
    </tr>`).join("")}</tbody>
  </table>`;

// B: 청구서형. 머리말 → 1쪽 표 → 2쪽 표(머리행 반복) + 합계 행 → 안내문, 쪽 번호는 바닥글.
const thisMonth = (row) => (row.months ? Math.floor(row.krw / row.months) : row.krw);
const billed = CARD_B_ROWS.filter((row) => row.krw !== null);
const totalKrw = billed.reduce((sum, row) => sum + row.krw, 0);
const totalThisMonth = billed.reduce((sum, row) => sum + thisMonth(row), 0);
const cardBHead = "<thead><tr><th>이용하신 곳</th><th>이용일</th><th>이용금액</th><th>할부</th><th>이번 달 결제금액</th></tr></thead>";
const cardBRow = (row) => `<tr>
  <td>${escape(row.merchant)}</td><td class="center">${row.date}</td>
  <td class="num">${row.krw === null ? "" : `${won(row.krw)}원`}</td>
  <td class="center">${row.krw === null ? "해외" : row.months ? `${row.months}개월` : "일시"}</td>
  <td class="num">${row.krw === null ? "" : `${won(thisMonth(row))}원`}</td>
</tr>`;
const cardB = `
  <h1>2026년 11월 이용대금 명세서</h1>
  <div style="display: flex; justify-content: space-between"><span>홍길동 님</span><span>결제일 2026.12.14</span></div>
  <p style="margin: 4px 0 12px">이번 달 결제하실 금액 ${won(totalThisMonth)}원</p>
  <table>${cardBHead}<tbody>${CARD_B_ROWS.slice(0, CARD_B_FIRST_PAGE_ROWS).map(cardBRow).join("")}</tbody></table>
  <table style="break-before: page">${cardBHead}<tbody>
    ${CARD_B_ROWS.slice(CARD_B_FIRST_PAGE_ROWS).map(cardBRow).join("")}
    <tr><td class="center">합계</td><td></td><td class="num">${won(totalKrw)}원</td><td></td><td class="num">${won(totalThisMonth)}원</td></tr>
  </tbody></table>
  <p style="margin-top: 12px">※ 해외 이용 원화 금액은 매입이 확정된 뒤 청구돼요.</p>`;

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage();
  const print = async (fileName, body, pdfOptions = {}) => {
    await page.setContent(`<!doctype html><html lang="ko"><meta charset="utf-8"><style>${style}</style><body>${body}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4", printBackground: true, margin: { top: "15mm", bottom: "18mm", left: "12mm", right: "12mm" }, ...pdfOptions,
    });
    writeFileSync(new URL(fileName, import.meta.url), pdf);
    console.log(`${fileName} ${pdf.length}바이트`);
  };

  await print(CARD_A_PDF_FILE_NAME, cardA);
  await print(CARD_B_PDF_FILE_NAME, cardB, {
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: '<div style="width: 100%; font-size: 8px; text-align: center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
} finally {
  await browser.close();
}
