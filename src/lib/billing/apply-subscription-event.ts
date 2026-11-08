import type { Plan } from "@/types";

type SubscriptionEvent = {
  type: string;
  data: { product_id: string; customer: { external_id?: string | null } };
};

export async function applySubscriptionEvent(
  event: SubscriptionEvent,
  proProductId: string,
  updatePlan: (userId: string, plan: Plan) => Promise<void>,
) {
  const plan = event.type === "subscription.active" ? "pro"
    : event.type === "subscription.revoked" ? "free" : null;
  const userId = event.data.customer.external_id;
  // 같은 조직의 다른 상품 구독이 Pro를 켜거나 끄지 않게 한다.
  if (!plan || !userId || event.data.product_id !== proProductId) return;

  await updatePlan(userId, plan);
}
