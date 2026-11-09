import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseStatement, StatementError } from "./parse";

describe("parseStatement", () => {
  it("CSV를 문자열로 읽어 날짜·큰 정수·빈 열을 보존한다", async () => {
    const csv = '﻿날짜,가맹점,금액,기타\n20261003,"GS25, 강남",9007199254740993,\n';
    expect(await parseStatement(new TextEncoder().encode(csv).buffer, "카드.CSV")).toEqual([
      ["날짜", "가맹점", "금액", "기타"],
      ["20261003", "GS25, 강남", "9007199254740993", ""],
    ]);
  });

  it("EUC-KR CSV도 읽는다", async () => {
    expect(await parseStatement(new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb, 44, 49]).buffer, "카드.csv"))
      .toEqual([["한글", "1"]]);
  });

  it.each(["xls", "xlsx"] as const)("%s 첫 시트만 문자열 배열로 읽는다", async (bookType) => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
      ["날짜", "가맹점", "금액"], [46298, "식당", -12500], [], ["2026-10-04", "카페", 0],
    ]), "첫 시트");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["무시"]]), "다른 시트");
    const buffer: ArrayBuffer = XLSX.write(book, { type: "array", bookType });

    expect(await parseStatement(buffer, `카드.${bookType}`)).toEqual([
      ["날짜", "가맹점", "금액"], ["46298", "식당", "-12500"],
      ["", "", ""], ["2026-10-04", "카페", "0"],
    ]);
  });

  it("엑셀 날짜 셀을 연월일 문자열로 읽는다", async () => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([[46298, "식당", 12500]]);
    sheet.A1.z = "m/d/yy";
    XLSX.utils.book_append_sheet(book, sheet, "내역");
    expect(await parseStatement(XLSX.write(book, { type: "array", bookType: "xlsx" }), "카드.xlsx"))
      .toEqual([["2026-10-03", "식당", "12500"]]);
  });

  it("PDF는 좌표로 복원한 표를 행으로 읽는다", async () => {
    const bytes = readFileSync(new URL("../../../tests/fixtures/pdf/card-a-history.pdf", import.meta.url));
    const rows = await parseStatement(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "카드.PDF");
    expect(rows[0]).toEqual(["이용일자", "카드번호", "승인번호", "이용가맹점", "이용금액", "해외이용금액(USD)"]);
    expect(rows[1]).toEqual(["2026-10-01", "1234-****-****-5678", "30000001", "스타벅스 강남점", "6,500", ""]);
  });

  it.each([
    ["글자가 없는 PDF(스캔본)", "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
      + "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"],
    ["깨진 PDF", "%PDF-1.4 비밀 거래 내용"],
  ])("%s는 원본 정보 없이 unsupported_file로 거절한다", async (_name, content) => {
    await expect(parseStatement(new TextEncoder().encode(content).buffer, "카드.pdf"))
      .rejects.toThrow(new StatementError("unsupported_file"));
  });

  it.each(["카드.hwp", "csv", "카드.csv.exe", "카드.pdf.exe"])("지원하지 않는 확장자 %s는 거절한다", async (name) => {
    await expect(parseStatement(new ArrayBuffer(0), name))
      .rejects.toThrow(new StatementError("unsupported_file"));
  });

  it("암호 보호된 엑셀은 원본 정보 없이 unsupported_file로 거절한다", async () => {
    const cfb = XLSX.CFB.utils.cfb_new();
    XLSX.CFB.utils.cfb_add(cfb, "EncryptedPackage", new Uint8Array(16));
    const bytes = XLSX.CFB.write(cfb, { type: "buffer" });
    const buffer = Uint8Array.from(bytes).buffer;
    await expect(parseStatement(buffer, "카드.xlsx"))
      .rejects.toThrow(new StatementError("unsupported_file"));
  });
});
