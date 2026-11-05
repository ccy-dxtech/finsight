import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
