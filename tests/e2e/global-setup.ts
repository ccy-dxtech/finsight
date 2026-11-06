import { adminClient, createUser } from "./support/supabase";

// 테스트 계정 2개(A: 주 사용자, B: RLS 확인용 다른 사용자)를 새로 만든다.
// 가입 트리거가 profiles(plan = 'free') 행을 만든다.
export default async function globalSetup(): Promise<void> {
  const admin = adminClient();
  const users = { a: await createUser(admin, "a"), b: await createUser(admin, "b") };
  process.env.E2E_USERS = JSON.stringify(users);
}
