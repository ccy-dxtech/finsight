import { afterEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { updateSession } from "@/lib/supabase/session";
import { config, proxy } from "./proxy";

vi.mock("@/lib/supabase/session", () => ({ updateSession: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it("비로그인 사용자를 원래 경로와 함께 보내고 갱신 쿠키·캐시 헤더를 보존한다", async () => {
  const response = NextResponse.next();
  response.cookies.set("session", "renewed", { httpOnly: true });
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("pragma", "no-cache");
  vi.mocked(updateSession).mockResolvedValue({ response, user: null });
  const result = await proxy(new NextRequest("https://example.com/dashboard/trends?x=1"));
  const location = new URL(result.headers.get("location")!);
  expect(location.pathname).toBe("/login");
  expect(location.searchParams.get("next")).toBe("/dashboard/trends?x=1");
  expect(result.cookies.get("session")).toMatchObject({ value: "renewed", httpOnly: true });
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(result.headers.get("pragma")).toBe("no-cache");
  expect(result.headers.has("x-middleware-next")).toBe(false);
});

it.each(["/login", "/auth/callback", "/dashboard-other"])("공개 경로 %s는 그대로 통과한다", async (path) => {
  const response = NextResponse.next();
  vi.mocked(updateSession).mockResolvedValue({ response, user: null });
  expect(await proxy(new NextRequest(`https://example.com${path}`))).toBe(response);
});

it("로그인 사용자는 보호 경로를 통과한다", async () => {
  const response = NextResponse.next();
  vi.mocked(updateSession).mockResolvedValue({ response, user: { id: "user" } as NonNullable<Awaited<ReturnType<typeof updateSession>>["user"]> });
  expect(await proxy(new NextRequest("https://example.com/dashboard"))).toBe(response);
});

it.each(["/_next/static/app.js", "/_next/image?url=test", "/favicon.ico", "/logo.svg", "/font.woff2"])("정적 자원 %s는 제외한다", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
});

it.each(["/dashboard", "/dashboard/reports/a", "/auth/callback", "/login"])("인증 경로 %s에 적용한다", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
});
