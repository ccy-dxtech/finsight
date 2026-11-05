import { describe, expect, it } from "vitest";
import { decodeCsv } from "./decode";

describe("decodeCsv", () => {
  it("UTF-8 한글을 읽는다", () => {
    expect(decodeCsv(new TextEncoder().encode("날짜,가맹점,금액\n한글").buffer))
      .toBe("날짜,가맹점,금액\n한글");
  });

  it("UTF-8로 읽을 수 없으면 EUC-KR 한글을 읽는다", () => {
    expect(decodeCsv(new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb]).buffer)).toBe("한글");
  });
});
