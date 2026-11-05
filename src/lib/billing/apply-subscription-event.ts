import type { Plan } from "@/types";

type SubscriptionEvent = {
  type: string;
  data: { customer: { external_id?: string | null } };
};

export async function applySubscriptionEvent(
  event: SubscriptionEvent,
  updatePlan: (userId: string, plan: Plan) => Promise<void>,
) {
  const plan = event.type === "subscription.active" ? "pro"
    : event.type === "subscription.revoked" ? "free" : null;
  const userId = event.data.customer.external_id;
  if (!plan || !userId) return;

  await updatePlan(userId, plan);
}
