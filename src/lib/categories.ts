export const CATEGORIES = [
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
] as const;

export type Category = (typeof CATEGORIES)[number];
