import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories";

describe("CATEGORIES", () => {
  it("고정된 카테고리 10개를 중복 없이 제공한다", () => {
    expect(CATEGORIES).toEqual([
      "식비",
      "카페·간식",
      "교통",
      "쇼핑",
      "구독·정기결제",
      "주거·통신",
      "의료·건강",
      "문화·여가",
      "교육",
      "기타",
    ]);
    expect(new Set(CATEGORIES).size).toBe(10);
  });
});
