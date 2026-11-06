// E2E 테스트 계정 준비용 헬퍼. 테스트 러너(Node)에서만 쓰고 앱 번들에는 들어가지 않는다.
// Google 로그인은 자동화할 수 없어서, service role로 이메일 계정을 만들고
// @supabase/ssr이 쓰는 것과 같은 세션 쿠키를 만들어 브라우저에 넣는다.
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES } from "../../../src/lib/categories";
import { getKstMonthStart } from "../../../src/lib/plan";

export type UserKey = "a" | "b";
export type E2EUser = { key: UserKey; id: string; email: string; password: string };

export const E2E_EMAILS: Record<UserKey, string> = {
  a: "e2e-a@finsight.test",
  b: "e2e-b@finsight.test",
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경 변수가 없어요. .env.local을 확인해 주세요.`);
  return value;
}

function check<T extends { error: { message: string } | null }>(result: T): T {
  if (result.error) throw new Error(result.error.message);
  return result;
}

export function adminClient(): SupabaseClient {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function deleteUserByEmail(admin: SupabaseClient, email: string): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  const user = data.users.find((candidate) => candidate.email === email);
  if (user) check(await admin.auth.admin.deleteUser(user.id));
}

export async function createUser(admin: SupabaseClient, key: UserKey): Promise<E2EUser> {
  const email = E2E_EMAILS[key];
  // 지난 실행이 중간에 멈춰 계정이 남아 있으면 지우고 새로 만든다.
  await deleteUserByEmail(admin, email);
  const password = `E2e-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? "테스트 계정을 만들지 못했어요.");
  return { key, id: data.user.id, email, password };
}

// global-setup이 process.env.E2E_USERS에 넣어 둔 계정을 꺼낸다.
export function e2eUser(key: UserKey): E2EUser {
  const raw = process.env.E2E_USERS;
  if (!raw) throw new Error("E2E_USERS가 없어요. global-setup이 실행됐는지 확인해 주세요.");
  return (JSON.parse(raw) as Record<UserKey, E2EUser>)[key];
}

// 새 세션으로 로그인해 @supabase/ssr 형식의 쿠키(sb-<ref>-auth-token)를 돌려준다.
export async function sessionCookies(user: E2EUser): Promise<{ name: string; value: string }[]> {
  const jar = new Map<string, string>();
  const client = createServerClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`테스트 계정으로 로그인하지 못했어요: ${error.message}`);
  if (jar.size === 0) throw new Error("세션 쿠키를 만들지 못했어요.");
  return [...jar].map(([name, value]) => ({ name, value }));
}

// 사용자의 거래·리포트를 비우고 플랜과 이번 달 사용 횟수를 맞춘다.
export async function resetUser(user: E2EUser, { plan = "free", used = 0 }: { plan?: "free" | "pro"; used?: number } = {}): Promise<void> {
  const admin = adminClient();
  check(await admin.from("transactions").delete().eq("user_id", user.id));
  check(await admin.from("reports").delete().eq("user_id", user.id));
  check(await admin.from("profiles").update({ plan, updated_at: new Date().toISOString() }).eq("id", user.id));
  check(await admin.from("usage").delete().eq("user_id", user.id));
  if (used > 0) {
    check(await admin.from("usage").insert({ user_id: user.id, month: getKstMonthStart(new Date()), count: used }));
  }
}

export async function setPlan(user: E2EUser, plan: "free" | "pro"): Promise<void> {
  check(await adminClient().from("profiles").update({ plan, updated_at: new Date().toISOString() }).eq("id", user.id));
}

// AI 없이 리포트 1건을 DB에 직접 넣는다. analyze 라우트가 저장하는 모양과 같다.
export async function seedReport(user: E2EUser, { fileName, totalAmount }: { fileName: string; totalAmount: bigint }): Promise<string> {
  const categoryTotals = Object.fromEntries(CATEGORIES.map((category) => [category, "0"]));
  categoryTotals["식비"] = totalAmount.toString();
  const { data } = check(await adminClient().from("reports").insert({
    user_id: user.id,
    file_name: fileName,
    period_start: "2026-10-01",
    period_end: "2026-10-31",
    transaction_count: 1,
    excluded_count: 0,
    totals: { totalAmount: totalAmount.toString(), categoryTotals },
    insights: { summary: "E2E 테스트용 리포트예요.", recurring: [], anomalies: [], savingTips: [] },
  }).select("id").single());
  return (data as { id: string }).id;
}

export async function seedTransactions(user: E2EUser, rows: { occurredOn: string; merchant: string; amount: bigint; category: string }[]): Promise<void> {
  check(await adminClient().from("transactions").insert(rows.map((row) => ({
    user_id: user.id, occurred_on: row.occurredOn, merchant: row.merchant,
    amount: row.amount.toString(), category: row.category,
  }))));
}

export async function countRows(user: E2EUser, table: "transactions" | "reports"): Promise<number> {
  const { count } = check(await adminClient().from(table).select("id", { count: "exact", head: true }).eq("user_id", user.id));
  return count ?? 0;
}
