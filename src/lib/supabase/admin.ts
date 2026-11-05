import "server-only";
import { createClient } from "@supabase/supabase-js";

// Polar 웹훅의 profiles 갱신에만 사용한다.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다.");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
