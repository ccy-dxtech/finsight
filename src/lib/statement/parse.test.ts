import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseStatement, StatementError } from "./parse";

describe("parseStatement", () => {
  it("CSV를 문자열로 읽어 날짜·큰 정수·빈 열을 보존한다", () => {
    const csv = '\uFEFF날짜,가맹점,금액,기타\n20261003,"GS25, 강남",9007199254740993,\n';
    expect(parseStatement(new TextEncoder().encode(csv).buffer, "카드.CSV")).toEqual([
      ["날짜", "가맹점", "금액", "기타"],
      ["20261003", "GS25, 강남", "9007199254740993", ""],
    ]);
  });

  it("EUC-KR CSV도 읽는다", () => {
    expect(parseStatement(new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb, 44, 49]).buffer, "카드.csv"))
      .toEqual([["한글", "1"]]);
  });

  it.each(["xls", "xlsx"] as const)("%s 첫 시트만 문자열 배열로 읽는다", (bookType) => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
      ["날짜", "가맹점", "금액"], [46298, "식당", -12500], [], ["2026-10-04", "카페", 0],
    ]), "첫 시트");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["무시"]]), "다른 시트");
    const buffer: ArrayBuffer = XLSX.write(book, { type: "array", bookType });

    expect(parseStatement(buffer, `카드.${bookType}`)).toEqual([
      ["날짜", "가맹점", "금액"], ["46298", "식당", "-12500"],
      ["", "", ""], ["2026-10-04", "카페", "0"],
    ]);
  });

  it("엑셀 날짜 셀을 연월일 문자열로 읽는다", () => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([[46298, "식당", 12500]]);
    sheet.A1.z = "m/d/yy";
    XLSX.utils.book_append_sheet(book, sheet, "내역");
    expect(parseStatement(XLSX.write(book, { type: "array", bookType: "xlsx" }), "카드.xlsx"))
      .toEqual([["2026-10-03", "식당", "12500"]]);
  });

  it.each(["카드.pdf", "csv", "카드.csv.exe"])("지원하지 않는 확장자 %s는 거절한다", (name) => {
    expect(() => parseStatement(new ArrayBuffer(0), name))
      .toThrow(new StatementError("unsupported_file"));
  });

  it("암호 보호된 엑셀은 원본 정보 없이 unsupported_file로 거절한다", () => {
    const cfb = XLSX.CFB.utils.cfb_new();
    XLSX.CFB.utils.cfb_add(cfb, "EncryptedPackage", new Uint8Array(16));
    const bytes = XLSX.CFB.write(cfb, { type: "buffer" });
    const buffer = Uint8Array.from(bytes).buffer;
    expect(() => parseStatement(buffer, "카드.xlsx"))
      .toThrow(new StatementError("unsupported_file"));
  });
});
