import "server-only";
import { Webhooks } from "@polar-sh/nextjs";
import type { NextRequest } from "next/server";
import { applySubscriptionEvent } from "@/lib/billing/apply-subscription-event";
import { createAdminClient } from "@/lib/supabase/admin";

async function applyEvent(event: Parameters<typeof applySubscriptionEvent>[0]) {
  await applySubscriptionEvent(event, async (userId, plan) => {
    const { error } = await createAdminClient()
      .from("profiles")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  });
}

export async function POST(request: NextRequest) {
  return Webhooks({
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
    onSubscriptionActive: applyEvent,
    onSubscriptionRevoked: applyEvent,
  })(request);
}
