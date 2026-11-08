import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { webhooks } from "@polar-sh/sdk/2026-10";
import { POST } from "./route";

const { validateEvent, from, update, eq, admin } = vi.hoisted(() => ({ validateEvent: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: admin }));
vi.mock("@polar-sh/sdk/2026-10", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@polar-sh/sdk/2026-10")>();
  return { ...actual, webhooks: { ...actual.webhooks, validateEvent } };
});
const request = () => new NextRequest("https://finsight.example/api/webhooks/polar", { method: "POST", body: "signed-body", headers: { "webhook-id": "event-1", "webhook-timestamp": "123", "webhook-signature": "signature" } });
const payload = (type: string, { productId = "pro-product", externalId = "user-1" as string | null } = {}) =>
  ({ type, data: { product_id: productId, customer: { external_id: externalId } } });

beforeEach(() => {
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "test-secret");
  vi.stubEnv("POLAR_PRO_PRODUCT_ID", "pro-product");
  admin.mockReturnValue({ from });
  from.mockReturnValue({ update });
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

it.each([["subscription.active", "pro"], ["subscription.revoked", "free"]])("검증된 %s는 관리자 권한으로 %s로 변경한다", async (type, plan) => {
  validateEvent.mockReturnValue(payload(type));
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(validateEvent).toHaveBeenCalledWith("signed-body", { "webhook-id": "event-1", "webhook-timestamp": "123", "webhook-signature": "signature" }, "test-secret");
  expect(from).toHaveBeenCalledWith("profiles");
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan }));
  expect(eq).toHaveBeenCalledWith("id", "user-1");
});

it.each([
  ["subscription.canceled", {}],
  ["subscription.active", { externalId: null }],
  ["subscription.active", { productId: "other-product" }],
] as const)("%s %o는 변경하지 않는다", async (type, options) => {
  validateEvent.mockReturnValue(payload(type, options));
  expect((await POST(request())).status).toBe(200);
  expect(admin).not.toHaveBeenCalled();
});

it("서명 검증 실패는 403이며 DB에 접근하지 않는다", async () => {
  validateEvent.mockImplementation(() => { throw new webhooks.PolarWebhookVerificationError("invalid signature"); });
  expect((await POST(request())).status).toBe(403);
  expect(admin).not.toHaveBeenCalled();
});

it("DB 오류를 성공으로 응답하지 않는다", async () => {
  validateEvent.mockReturnValue(payload("subscription.active"));
  eq.mockResolvedValue({ error: new Error("db failed") });
  await expect(POST(request())).rejects.toThrow("db failed");
});
