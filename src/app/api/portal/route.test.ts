import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CustomerPortal } from "@polar-sh/nextjs";
import { GET } from "./route";

const { getUser, portal } = vi.hoisted(() => ({ getUser: vi.fn(), portal: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser } }) }));
vi.mock("@polar-sh/nextjs", () => ({ CustomerPortal: vi.fn(() => portal) }));
beforeEach(() => {
  vi.stubEnv("POLAR_ACCESS_TOKEN", "test-token");
  getUser.mockResolvedValue({ data: { user: { id: "session-user" } }, error: null });
  portal.mockResolvedValue(Response.redirect("https://sandbox.polar.sh/portal"));
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

it("세션 사용자 ID로만 포털을 연다", async () => {
  const request = new NextRequest("https://finsight.example/api/portal?external_customer_id=attacker");
  const response = await GET(request);
  expect(response.headers.get("location")).toBe("https://sandbox.polar.sh/portal");
  const config = vi.mocked(CustomerPortal).mock.calls[0][0];
  expect(config).toMatchObject({ environment: "sandbox", accessToken: "test-token" });
  expect(await config.getExternalCustomerId!(request)).toBe("session-user");
});

it.each([null, { message: "invalid session" }])("미인증 또는 인증 실패면 로그인으로 이동한다: %s", async (error) => {
  getUser.mockResolvedValue({ data: { user: error ? { id: "untrusted" } : null }, error });
  const response = await GET(new NextRequest("https://finsight.example/api/portal"));
  expect(response.headers.get("location")).toBe("https://finsight.example/login");
  expect(CustomerPortal).not.toHaveBeenCalled();
});
