import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home, { metadata } from "./page";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser } }) }));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const text = (html: string) => html.replace(/<[^>]+>/g, "");

it("비로그인 랜딩에 히어로, 사용 방법, 요금제, 푸터를 순서대로 표시한다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  vi.stubEnv("NEXT_PUBLIC_PRO_PRICE_LABEL", "월 2,000원");
  const html = renderToStaticMarkup(await Home());
  expect(html).toContain('href="/login"');
  expect(text(html)).toContain("월 2,000원");
  expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<ol"));
  expect(html.indexOf("<ol")).toBeLessThan(html.indexOf("월 3회 분석"));
  expect(html.indexOf("월 30회 분석")).toBeLessThan(html.indexOf("<footer"));
  expect(text(html.slice(html.indexOf("<footer")))).toContain("FinSight");
  expect(html).not.toMatch(/Get started|Upgrade|Powered by AI|FAQ/);
});

it("헤더에 랜딩으로 가는 로고와 보조 버튼 '로그인'을 둔다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const html = renderToStaticMarkup(await Home());
  const header = html.match(/<header[^>]*>(.*?)<\/header>/)?.[1] ?? "";
  expect(header).toMatch(/<a [^>]*href="\/"[^>]*>Fin<b[^>]*>Sight<\/b><\/a>/);
  expect(header).toMatch(/<a [^>]*href="\/login"[^>]*bg-surface-strong[^>]*>로그인<\/a>/);
  expect(html.indexOf("<header")).toBeLessThan(html.indexOf("<h1"));
});

it("초록(주요) 버튼은 히어로의 시작하기 하나뿐이다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const html = renderToStaticMarkup(await Home());
  const primaryLinks = html.match(/<a [^>]*bg-primary text-on-primary[^>]*>[^<]*<\/a>/g) ?? [];
  expect(primaryLinks).toHaveLength(1);
  expect(primaryLinks[0]).toContain("시작하기");
});

it("/#pricing 주소로 요금제 섹션에 바로 닿는다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const html = renderToStaticMarkup(await Home());
  expect(html).toMatch(/<section[^>]*id="pricing"[^>]*>/);
  expect(html.indexOf('id="pricing"')).toBeLessThan(html.indexOf("월 3회 분석"));
});

it("헤더·섹션·푸터 내용은 같은 최대 너비·좌우 여백 줄에서 시작한다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const html = renderToStaticMarkup(await Home());
  const containers = [...html.matchAll(/<(header|section|footer)[^>]*><div class="([^"]+)"/g)].map((m) => m[2]);
  expect(containers.length).toBeGreaterThanOrEqual(5);
  for (const cls of containers) {
    expect(cls.split(" ")).toEqual(expect.arrayContaining(["mx-auto", "max-w-[1200px]", "px-8"]));
  }
  const [, footerClass] = html.match(/<footer class="([^"]+)"/) ?? [];
  expect(footerClass).not.toMatch(/(^|\s)px-/);
});

it("인증된 사용자는 헤더와 히어로에서 대시보드로 이동한다", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  const html = renderToStaticMarkup(await Home());
  expect(html.match(/href="\/dashboard"[^>]*>대시보드로 가기<\/a>/g)).toHaveLength(2);
  expect(html.match(/<header[^>]*>.*<\/header>/)?.[0]).not.toContain("로그인");
});

it("검색·공유용 제목과 설명이 서비스를 한국어로 설명한다", () => {
  expect(String(metadata.title)).toContain("FinSight");
  expect(String(metadata.title)).toContain("카드 명세서");
  expect(String(metadata.description)).toContain("CSV·엑셀");
});
