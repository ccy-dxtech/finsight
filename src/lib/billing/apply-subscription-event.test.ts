import { expect, it, vi } from "vitest";
import { applySubscriptionEvent } from "./apply-subscription-event";

it.each([["subscription.active", "pro"], ["subscription.revoked", "free"]] as const)("%s는 %s로 변경한다", async (type, plan) => {
  const updatePlan = vi.fn().mockResolvedValue(undefined);
  await applySubscriptionEvent({ type, data: { customer: { external_id: "user-1" } } }, updatePlan);
  expect(updatePlan).toHaveBeenCalledExactlyOnceWith("user-1", plan);
});

it.each(["subscription.canceled", "subscription.updated"])("%s는 플랜을 유지한다", async (type) => {
  const updatePlan = vi.fn();
  await applySubscriptionEvent({ type, data: { customer: { external_id: "user-1" } } }, updatePlan);
  expect(updatePlan).not.toHaveBeenCalled();
});

it.each([null, undefined, ""])("external id가 %s면 무시한다", async (external_id) => {
  const updatePlan = vi.fn();
  await applySubscriptionEvent({ type: "subscription.active", data: { customer: { external_id } } }, updatePlan);
  expect(updatePlan).not.toHaveBeenCalled();
});

it("저장 실패를 호출자에게 전달한다", async () => {
  const updatePlan = vi.fn().mockRejectedValue(new Error("db failed"));
  await expect(applySubscriptionEvent({ type: "subscription.active", data: { customer: { external_id: "user-1" } } }, updatePlan)).rejects.toThrow("db failed");
});
