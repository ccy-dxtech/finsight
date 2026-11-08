import { expect, it, vi } from "vitest";
import { applySubscriptionEvent } from "./apply-subscription-event";

const event = (type: string, { productId = "pro-product", externalId = "user-1" as string | null | undefined } = {}) =>
  ({ type, data: { product_id: productId, customer: { external_id: externalId } } });

it.each([["subscription.active", "pro"], ["subscription.revoked", "free"]] as const)("프로 상품의 %s는 %s로 변경한다", async (type, plan) => {
  const updatePlan = vi.fn().mockResolvedValue(undefined);
  await applySubscriptionEvent(event(type), "pro-product", updatePlan);
  expect(updatePlan).toHaveBeenCalledExactlyOnceWith("user-1", plan);
});

it.each(["subscription.active", "subscription.revoked"])("다른 상품의 %s는 플랜을 바꾸지 않는다", async (type) => {
  const updatePlan = vi.fn();
  await applySubscriptionEvent(event(type, { productId: "other-product" }), "pro-product", updatePlan);
  expect(updatePlan).not.toHaveBeenCalled();
});

it.each(["subscription.canceled", "subscription.updated"])("%s는 플랜을 유지한다", async (type) => {
  const updatePlan = vi.fn();
  await applySubscriptionEvent(event(type), "pro-product", updatePlan);
  expect(updatePlan).not.toHaveBeenCalled();
});

it.each([null, undefined, ""])("external id가 %s면 무시한다", async (externalId) => {
  const updatePlan = vi.fn();
  const active = event("subscription.active");
  await applySubscriptionEvent({ ...active, data: { ...active.data, customer: { external_id: externalId } } }, "pro-product", updatePlan);
  expect(updatePlan).not.toHaveBeenCalled();
});

it("저장 실패를 호출자에게 전달한다", async () => {
  const updatePlan = vi.fn().mockRejectedValue(new Error("db failed"));
  await expect(applySubscriptionEvent(event("subscription.active"), "pro-product", updatePlan)).rejects.toThrow("db failed");
});
