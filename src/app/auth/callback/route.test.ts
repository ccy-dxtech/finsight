import { afterEach, expect, it, vi } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { GET } from "./route";

const { exchange } = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: vi.fn(async () => ({ auth: { exchangeCodeForSession: exchange } })) }));
afterEach(() => vi.clearAllMocks());

it.each([["/dashboard/trends?x=1", "/dashboard/trends?x=1"], ["//evil.com", "/dashboard"]])("교환 성공 후 안전한 경로로 이동한다: %s", async (next, expected) => {
  exchange.mockResolvedValue({ error: null });
  const response = await GET(new Request(`https://example.com/auth/callback?code=valid&next=${encodeURIComponent(next)}`));
  expect(exchange).toHaveBeenCalledWith("valid");
  expect(response.headers.get("location")).toBe(`https://example.com${expected}`);
});

it.each(["missing", "error", "throw"])("코드 교환 실패 %s는 로그인 오류로 안내한다", async (mode) => {
  exchange.mockResolvedValue({ error: new Error("invalid") });
  if (mode === "throw") exchange.mockRejectedValue(new Error("network"));
  const response = await GET(new Request(`https://example.com/auth/callback?next=%2Fapi%2Fcheckout${mode === "missing" ? "" : "&code=bad"}`));
  const location = new URL(response.headers.get("location")!);
  expect(location.pathname).toBe("/login");
  expect(location.searchParams.get("error")).toBe("auth_failed");
  expect(location.searchParams.get("next")).toBe("/api/checkout");
  if (mode === "missing") expect(createServerClient).not.toHaveBeenCalled();
});
