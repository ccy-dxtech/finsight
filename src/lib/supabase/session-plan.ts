import "server-only";
import { cache } from "react";
import type { Plan } from "@/types";
import { createServerClient } from "./server";

// layout과 page가 같은 요청에서 각각 불러도 세션 확인과 profiles 조회는 한 번만 한다.
export const getSessionPlan = cache(async (): Promise<{ userId: string; plan: Plan } | null> => {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("plan").eq("id", user.id).maybeSingle();
  if (profileError || !profile || (profile.plan !== "free" && profile.plan !== "pro")) {
    throw new Error("플랜 정보를 불러오지 못했어요.");
  }
  return { userId: user.id, plan: profile.plan };
});
