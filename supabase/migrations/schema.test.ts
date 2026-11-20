import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getMonthlyLimit } from "@/lib/plan";

const migration = new URL("./0001_init.sql", import.meta.url);
const sql = existsSync(migration)
  ? readFileSync(migration, "utf8").replace(/--[^\n]*/g, "").toLowerCase()
  : "";
const policies = sql.match(/create policy\b[^;]+;/g) ?? [];
const rpc = sql.match(/create function public\.commit_analysis\s*\(([^)]*)\)([\s\S]*?)\$\$;/);

describe("초기 Supabase 스키마", () => {
  it.each(["profiles", "reports", "transactions", "usage"])(
    "%s 테이블에 RLS를 켠다",
    (table) => {
      expect(sql).toMatch(new RegExp(`create table public\\.${table}\\s*\\(`));
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security;`));
    },
  );

  it.each(["profiles", "usage"])("%s에는 본인 SELECT 정책만 둔다", (table) => {
    const tablePolicies = policies.filter((policy) =>
      new RegExp(`on public\\.${table}\\b`).test(policy),
    );
    expect(tablePolicies).toHaveLength(1);
    expect(tablePolicies[0]).toMatch(/for select to authenticated/);
    expect(tablePolicies[0]).toMatch(
      new RegExp(`using\\s*\\(auth\\.uid\\(\\) = ${table === "profiles" ? "id" : "user_id"}\\)`),
    );
    expect(tablePolicies.join(" ")).not.toMatch(/for\s+(insert|update|delete|all)\b/);
  });

  it.each(["reports", "transactions"])("%s에는 본인 조회·삭제 정책만 둔다", (table) => {
    const tablePolicies = policies.filter((policy) =>
      new RegExp(`on public\\.${table}\\b`).test(policy),
    );
    expect(tablePolicies).toHaveLength(2);
    expect(tablePolicies.join(" ")).toMatch(/for select to authenticated/);
    expect(tablePolicies.join(" ")).toMatch(/for delete to authenticated/);
    for (const policy of tablePolicies) {
      expect(policy).toMatch(/using\s*\(auth\.uid\(\) = user_id\)/);
      expect(policy).not.toMatch(/for\s+(insert|update|all)\b/);
    }
  });

  it("RPC는 사용자 ID 인자 없이 세션 사용자로만 실행한다", () => {
    expect(rpc).not.toBeNull();
    expect(rpc?.[1].replace(/\s+/g, " ").trim()).toBe(
      "p_report jsonb, p_transactions jsonb, p_month date",
    );
    expect(rpc?.[1]).not.toMatch(/user_id/);
    expect(rpc?.[2]).toMatch(/returns uuid/);
    expect(rpc?.[2]).toMatch(/security definer/);
    expect(rpc?.[2]).toMatch(/set search_path = public/);
    expect(rpc?.[2]).toMatch(/v_user_id uuid := auth\.uid\(\)/);
    expect(rpc?.[2]).toMatch(/if v_user_id is null then\s+raise exception/);
  });

  it("RPC는 리포트·거래 저장 후 사용량을 증가시키고 ID를 반환한다", () => {
    expect(rpc?.[2]).toMatch(
      /insert into public\.reports[\s\S]+insert into public\.transactions[\s\S]+jsonb_array_elements\(p_transactions\)[\s\S]+insert into public\.usage[\s\S]+on conflict \(user_id, month\) do update[\s\S]+count = public\.usage\.count \+ 1[\s\S]+return v_report_id/,
    );
    expect(sql).toMatch(/amount bigint not null/);
    expect(sql).toMatch(/on public\.transactions \(user_id, occurred_on\)/);
  });

  it("가입 트리거는 무료 프로필을 만든다", () => {
    expect(sql).toMatch(/insert into public\.profiles \(id, plan\)\s+values \(new\.id, 'free'\)/);
    expect(sql).toMatch(/after insert on auth\.users[\s\S]+execute function public\.handle_new_user\(\)/);
  });

  it("RPC 실행 권한은 authenticated에만 부여한다", () => {
    expect(sql).toMatch(/revoke all on function public\.commit_analysis\(jsonb, jsonb, date\) from public/);
    expect(sql).toMatch(/grant execute on function public\.commit_analysis\(jsonb, jsonb, date\) to authenticated/);
  });
});

// OWASP A06: 브라우저에서 RPC를 직접 불러 라우트의 한도·건수 검사를 건너뛰지 못하게 한다.
const limitsMigration = new URL("./0002_commit_analysis_limits.sql", import.meta.url);
const limitsSql = existsSync(limitsMigration)
  ? readFileSync(limitsMigration, "utf8").replace(/--[^\n]*/g, "").toLowerCase()
  : "";
const limitsRpc = limitsSql.match(
  /create or replace function public\.commit_analysis\s*\(([^)]*)\)([\s\S]*?)\$\$;/,
);
const limitsBody = limitsRpc?.[2] ?? "";
const firstInsert = limitsBody.indexOf("insert into public.reports");

describe("commit_analysis 한도 마이그레이션(0002)", () => {
  it("같은 시그니처로 세션 사용자 전용 RPC를 교체한다", () => {
    expect(limitsRpc).not.toBeNull();
    expect(limitsRpc?.[1].replace(/\s+/g, " ").trim()).toBe(
      "p_report jsonb, p_transactions jsonb, p_month date",
    );
    expect(limitsBody).toMatch(/security definer/);
    expect(limitsBody).toMatch(/set search_path = public/);
    expect(limitsBody).toMatch(/v_user_id uuid := auth\.uid\(\)/);
    expect(limitsBody).toMatch(/if v_user_id is null then\s+raise exception/);
    expect(limitsSql).not.toMatch(/grant execute[^;]+to (anon|public)/);
  });

  it("거래가 배열이 아니거나 1~3,000건을 벗어나면 저장 전에 거절한다", () => {
    expect(limitsBody).toMatch(
      /jsonb_typeof\(p_transactions\) <> 'array'\s+or jsonb_array_length\(p_transactions\) not between 1 and 3000 then\s+raise exception/,
    );
    expect(limitsBody.search(/not between 1 and 3000/)).toBeLessThan(firstInsert);
  });

  it("p_month가 서버 기준 KST 이번 달이 아니면 거절한다", () => {
    expect(limitsBody).toMatch(
      /p_month is distinct from date_trunc\('month', now\(\) at time zone 'asia\/seoul'\)::date then\s+raise exception/,
    );
    expect(limitsBody.search(/p_month is distinct from/)).toBeLessThan(firstInsert);
  });

  it("리포트 JSON이 1MB를 넘으면 거절한다", () => {
    expect(limitsBody).toMatch(/octet_length\(p_report::text\) > 1000000 then\s+raise exception/);
    expect(limitsBody.search(/octet_length\(p_report::text\)/)).toBeLessThan(firstInsert);
  });

  it("usage 행을 잠근 뒤 플랜 한도에 도달했으면 저장 전에 거절한다", () => {
    expect(limitsBody).toMatch(
      /from public\.usage\s+where user_id = v_user_id and month = p_month\s+for update/,
    );
    expect(limitsBody).toMatch(/if v_count >= coalesce\(v_limit, 0\) then\s+raise exception/);
    expect(limitsBody.search(/for update/)).toBeLessThan(firstInsert);
    expect(limitsBody.search(/if v_count >= coalesce/)).toBeLessThan(firstInsert);
  });

  it("SQL의 플랜 한도는 getMonthlyLimit과 같다", () => {
    const limits = limitsBody.match(/case plan when 'pro' then (\d+) else (\d+) end/);
    expect(Number(limits?.[1])).toBe(getMonthlyLimit("pro"));
    expect(Number(limits?.[2])).toBe(getMonthlyLimit("free"));
  });

  it("저장 순서와 사용량 +1, ID 반환은 그대로다", () => {
    expect(limitsBody).toMatch(
      /insert into public\.reports[\s\S]+insert into public\.transactions[\s\S]+jsonb_array_elements\(p_transactions\)[\s\S]+update public\.usage set count = count \+ 1\s+where user_id = v_user_id and month = p_month[\s\S]+return v_report_id/,
    );
  });
});

// OWASP A06(거래 크기) + Supabase advisor(함수 실행 권한·RLS initplan·FK 인덱스).
// Supabase는 public 스키마 함수에 anon·authenticated EXECUTE를 직접 주므로 `from public` 회수로는 막히지 않는다.
const hardeningMigration = new URL("./0003_rpc_size_grants_rls.sql", import.meta.url);
const hardeningSql = existsSync(hardeningMigration)
  ? readFileSync(hardeningMigration, "utf8").replace(/--[^\n]*/g, "").toLowerCase()
  : "";
const hardeningRpc = hardeningSql.match(
  /create or replace function public\.commit_analysis\s*\(([^)]*)\)([\s\S]*?)\$\$;/,
);
const hardeningBody = hardeningRpc?.[2] ?? "";
const hardeningInsert = hardeningBody.indexOf("insert into public.reports");

describe("RPC 크기·실행 권한·RLS 정리 마이그레이션(0003)", () => {
  it("0002의 세션 사용자·건수·월·리포트 크기·한도 검사를 그대로 둔다", () => {
    expect(hardeningRpc).not.toBeNull();
    expect(hardeningRpc?.[1].replace(/\s+/g, " ").trim()).toBe(
      "p_report jsonb, p_transactions jsonb, p_month date",
    );
    expect(hardeningBody).toMatch(/security definer/);
    expect(hardeningBody).toMatch(/set search_path = public/);
    expect(hardeningBody).toMatch(/if v_user_id is null then\s+raise exception/);
    expect(hardeningBody).toMatch(/not between 1 and 3000 then\s+raise exception/);
    expect(hardeningBody).toMatch(/p_month is distinct from date_trunc\('month', now\(\) at time zone 'asia\/seoul'\)::date/);
    expect(hardeningBody).toMatch(/octet_length\(p_report::text\) > 1000000 then\s+raise exception/);
    expect(hardeningBody).toMatch(/for update/);
    expect(hardeningBody).toMatch(/if v_count >= coalesce\(v_limit, 0\) then\s+raise exception/);
    expect(hardeningBody).toMatch(
      /insert into public\.reports[\s\S]+insert into public\.transactions[\s\S]+update public\.usage set count = count \+ 1[\s\S]+return v_report_id/,
    );
  });

  it("SQL의 플랜 한도는 getMonthlyLimit과 같다", () => {
    const limits = hardeningBody.match(/case plan when 'pro' then (\d+) else (\d+) end/);
    expect(Number(limits?.[1])).toBe(getMonthlyLimit("pro"));
    expect(Number(limits?.[2])).toBe(getMonthlyLimit("free"));
  });

  it("거래 JSON이 2MB를 넘거나 가맹점명이 500자를 넘으면 저장 전에 거절한다", () => {
    expect(hardeningBody).toMatch(
      /octet_length\(p_transactions::text\) > 2000000\s+or exists \(select 1 from jsonb_array_elements\(p_transactions\) as entries\(item\)\s+where length\(item ->> 'merchant'\) > 500\) then\s+raise exception/,
    );
    expect(hardeningBody.search(/octet_length\(p_transactions::text\)/)).toBeLessThan(hardeningInsert);
  });

  it("commit_analysis는 anon에서, handle_new_user는 anon·authenticated에서 실행 권한을 회수한다", () => {
    expect(hardeningSql).toMatch(
      /revoke execute on function public\.commit_analysis\(jsonb, jsonb, date\) from anon;/,
    );
    expect(hardeningSql).toMatch(
      /revoke execute on function public\.handle_new_user\(\) from anon, authenticated;/,
    );
    expect(hardeningSql).not.toMatch(/grant [^;]+ to (anon|public)\b/);
  });

  it.each([
    ["profiles_select_own", "profiles", "id"],
    ["reports_select_own", "reports", "user_id"],
    ["reports_delete_own", "reports", "user_id"],
    ["transactions_select_own", "transactions", "user_id"],
    ["transactions_delete_own", "transactions", "user_id"],
    ["usage_select_own", "usage", "user_id"],
  ])("%s 정책은 auth.uid()를 한 번만 평가한다", (policy, table, column) => {
    expect(hardeningSql).toMatch(
      new RegExp(
        `alter policy ${policy} on public\\.${table}\\s+using \\(\\(select auth\\.uid\\(\\)\\) = ${column}\\);`,
      ),
    );
  });

  it("reports.user_id 외래 키에 인덱스를 만든다", () => {
    expect(hardeningSql).toMatch(/create index \w+\s+on public\.reports \(user_id\);/);
  });
});
