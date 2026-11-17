import "server-only";
import { Webhooks } from "@polar-sh/nextjs";
import type { NextRequest } from "next/server";
import { applySubscriptionEvent } from "@/lib/billing/apply-subscription-event";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/types";

async function setPlan(userId: string, plan: Plan) {
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

async function applyEvent(event: Parameters<typeof applySubscriptionEvent>[0]) {
  await applySubscriptionEvent(event, process.env.POLAR_PRO_PRODUCT_ID!, setPlan);
}

export async function POST(request: NextRequest) {
  return Webhooks({
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
    onSubscriptionActive: applyEvent,
    onSubscriptionRevoked: applyEvent,
    onSubscriptionUncanceled: applyEvent,
  })(request);
}
