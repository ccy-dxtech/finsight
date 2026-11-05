import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { webhooks } from "@polar-sh/sdk/2026-10";
import { POST } from "./route";

const { validateEvent, from, update, eq, admin } = vi.hoisted(() => ({ validateEvent: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), admin: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: admin }));
vi.mock("@polar-sh/sdk/2026-10", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@polar-sh/sdk/2026-10")>();
  return { ...actual, webhooks: { ...actual.webhooks, validateEvent } };
});
const request = () => new NextRequest("https://finsight.example/api/webhooks/polar", { method: "POST", body: "signed-body", headers: { "webhook-id": "event-1", "webhook-timestamp": "123", "webhook-signature": "signature" } });

beforeEach(() => {
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "test-secret");
  admin.mockReturnValue({ from });
  from.mockReturnValue({ update });
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

it.each([["subscription.active", "pro"], ["subscription.revoked", "free"]])("검증된 %s는 관리자 권한으로 %s로 변경한다", async (type, plan) => {
  validateEvent.mockReturnValue({ type, data: { customer: { external_id: "user-1" } } });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(validateEvent).toHaveBeenCalledWith("signed-body", { "webhook-id": "event-1", "webhook-timestamp": "123", "webhook-signature": "signature" }, "test-secret");
  expect(from).toHaveBeenCalledWith("profiles");
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan }));
  expect(eq).toHaveBeenCalledWith("id", "user-1");
});

it.each([["subscription.canceled", "user-1"], ["subscription.active", null]])("%s / external id %s는 변경하지 않는다", async (type, external_id) => {
  validateEvent.mockReturnValue({ type, data: { customer: { external_id } } });
  expect((await POST(request())).status).toBe(200);
  expect(admin).not.toHaveBeenCalled();
});

it("서명 검증 실패는 403이며 DB에 접근하지 않는다", async () => {
  validateEvent.mockImplementation(() => { throw new webhooks.PolarWebhookVerificationError("invalid signature"); });
  expect((await POST(request())).status).toBe(403);
  expect(admin).not.toHaveBeenCalled();
});

it("DB 오류를 성공으로 응답하지 않는다", async () => {
  validateEvent.mockReturnValue({ type: "subscription.active", data: { customer: { external_id: "user-1" } } });
  eq.mockResolvedValue({ error: new Error("db failed") });
  await expect(POST(request())).rejects.toThrow("db failed");
});
