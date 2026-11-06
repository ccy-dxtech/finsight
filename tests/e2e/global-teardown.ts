import { adminClient, deleteUserByEmail, E2E_EMAILS } from "./support/supabase";

// 테스트 계정을 지운다. 거래·리포트·사용량은 auth.users의 on delete cascade로 함께 지워진다.
// E2E_KEEP_USERS=1이면 디버깅을 위해 남겨 둔다.
export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_KEEP_USERS === "1") return;
  const admin = adminClient();
  for (const email of Object.values(E2E_EMAILS)) await deleteUserByEmail(admin, email);
}
