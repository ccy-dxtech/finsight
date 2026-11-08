import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Checkout } from "@polar-sh/nextjs";
import { GET } from "./route";

const { getSessionPlan, checkout } = vi.hoisted(() => ({ getSessionPlan: vi.fn(), checkout: vi.fn() }));
vi.mock("@/lib/supabase/session-plan", () => ({ getSessionPlan }));
vi.mock("@polar-sh/nextjs", () => ({ Checkout: vi.fn(() => checkout) }));

beforeEach(() => {
  vi.stubEnv("POLAR_ACCESS_TOKEN", "test-token");
  vi.stubEnv("POLAR_PRO_PRODUCT_ID", "pro-product");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://finsight.example");
  getSessionPlan.mockResolvedValue({ userId: "session-user", plan: "free" });
  checkout.mockResolvedValue(Response.redirect("https://sandbox.polar.sh/checkout"));
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

it("쿼리의 고객·상품·할인 설정을 버리고 세션 사용자와 서버 상품만 전달한다", async () => {
  const response = await GET(new NextRequest("https://finsight.example/api/checkout?external_customer_id=attacker&customer_id=other&products=cheap&products=free&discount_id=discount&metadata=%7B%7D"));
  expect(response.headers.get("location")).toBe("https://sandbox.polar.sh/checkout");
  expect(Checkout).toHaveBeenCalledWith(expect.objectContaining({ environment: "sandbox", accessToken: "test-token", successUrl: "https://finsight.example/dashboard?checkout=success", includeCheckoutId: false }));
  const url = new URL(checkout.mock.calls[0][0].url);
  expect([...url.searchParams]).toEqual([["products", "pro-product"], ["external_customer_id", "session-user"]]);
});

it("미인증이면 로그인 후 체크아웃으로 돌아온다", async () => {
  getSessionPlan.mockResolvedValue(null);
  const response = await GET(new NextRequest("https://finsight.example/api/checkout?next=//evil.example"));
  const url = new URL(response.headers.get("location")!);
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("next")).toBe("/api/checkout");
  expect(Checkout).not.toHaveBeenCalled();
});

it("이미 프로면 두 번째 구독을 만들지 않고 설정으로 보낸다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "session-user", plan: "pro" });
  const response = await GET(new NextRequest("https://finsight.example/api/checkout"));
  expect(response.headers.get("location")).toBe("https://finsight.example/dashboard/settings");
  expect(Checkout).not.toHaveBeenCalled();
});
