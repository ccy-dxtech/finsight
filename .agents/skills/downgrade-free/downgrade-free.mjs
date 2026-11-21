// 테스트 계정을 Pro → Free로 되돌린다.
//   1. Polar sandbox: 그 사용자의 Pro 상품 활성 구독을 즉시 해지(revoke)한다.
//   2. DB: profiles.plan을 'free'로 바꾼다. 로컬에서는 Polar 웹훅이 오지 않으므로 직접 쓴다.
//
// 사용법(어느 폴더에서 실행해도 된다):
//   node .claude/skills/downgrade-free/downgrade-free.mjs                    # Pro 계정 목록만 본다
//   node .claude/skills/downgrade-free/downgrade-free.mjs <이메일> --dry-run  # 바꾸지 않고 상태만 본다
//   node .claude/skills/downgrade-free/downgrade-free.mjs <이메일>            # 다운그레이드
//
// process.exit()는 쓰지 않는다. Windows에서 fetch 소켓이 열린 채 부르면 Node가 assertion으로 죽는다.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const POLAR_API = "https://sandbox-api.polar.sh";

main().catch((error) => {
  console.error(`오류: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const envFile = fileURLToPath(new URL("../../../.env.local", import.meta.url));
  if (!existsSync(envFile)) throw new Error(`${envFile} 이 없습니다.`);
  process.loadEnvFile(envFile);

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const email = args.find((a) => !a.startsWith("--"))?.toLowerCase();

  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 비어 있습니다.");
  }
  const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: list, error: usersError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw new Error(`사용자 목록 조회 실패: ${usersError.message}`);
  const users = list.users;

  if (!email) {
    const { data, error } = await db.from("profiles").select("id").eq("plan", "pro");
    if (error) throw new Error(`profiles 조회 실패: ${error.message}`);
    const proIds = new Set(data.map((p) => p.id));
    const pros = users.filter((u) => proIds.has(u.id));
    console.log(pros.length ? "Pro 계정:" : "Pro 계정이 없습니다.");
    for (const u of pros) console.log(`  ${u.email}  ${u.id}`);
    return;
  }

  const user = users.find((u) => u.email?.toLowerCase() === email);
  if (!user) throw new Error(`${email} 사용자가 없습니다.`);
  console.log(`대상: ${user.email} (${user.id})${dryRun ? "  [dry-run: 바꾸지 않음]" : ""}`);

  const { data: profile, error: profileError } = await db
    .from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error(`profiles 조회 실패: ${profileError.message}`);
  if (!profile) throw new Error("profiles 행이 없습니다. docs/OPERATIONS.md \"profiles 행 채우기\"를 먼저 하세요.");

  // 1. Polar. 실패하면 예외로 멈춰 DB를 건드리지 않는다(두 쪽 상태가 어긋나지 않게).
  const { POLAR_SERVER, POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID } = process.env;
  const missing = Object.entries({ POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID })
    .filter(([, v]) => !v).map(([k]) => k);

  if (missing.length) {
    console.log(`Polar: 건너뜀. .env.local에 ${missing.join(", ")} 값이 없어 구독을 조회할 수 없습니다.`);
  } else {
    if (POLAR_SERVER !== "sandbox") {
      throw new Error(`POLAR_SERVER가 sandbox가 아닙니다(${POLAR_SERVER}). sandbox 외에는 건드리지 않습니다.`);
    }
    const polar = async (method, path) => {
      const res = await fetch(`${POLAR_API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Polar ${method} ${path} 실패: ${res.status} ${await res.text()}`);
      return res.json();
    };

    const query = new URLSearchParams({
      external_customer_id: user.id,
      product_id: POLAR_PRO_PRODUCT_ID,
      active: "true",
      limit: "100",
    });
    const { items } = await polar("GET", `/v1/subscriptions/?${query}`);
    if (!items.length) console.log("Polar: 활성 Pro 구독 없음");
    for (const s of items) {
      if (dryRun) {
        console.log(`Polar: 활성 구독 ${s.id} (${s.status})`);
        continue;
      }
      const revoked = await polar("DELETE", `/v1/subscriptions/${s.id}`);
      console.log(`Polar: 구독 ${s.id} 해지 → ${revoked.status}`);
    }
  }

  // 2. DB
  if (profile.plan === "free") {
    console.log("DB: 이미 free");
  } else if (dryRun) {
    console.log(`DB: ${profile.plan} (dry-run이라 그대로 둠)`);
  } else {
    const { error } = await db
      .from("profiles")
      .update({ plan: "free", updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw new Error(`profiles 갱신 실패: ${error.message}`);
    const { data: after, error: afterError } = await db
      .from("profiles").select("plan").eq("id", user.id).single();
    if (afterError) throw new Error(`profiles 재조회 실패: ${afterError.message}`);
    console.log(`DB: ${profile.plan} → ${after.plan}`);
  }
}
