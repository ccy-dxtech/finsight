-- 1) commit_analysis에 거래 JSON 크기·가맹점명 길이 검사를 더한다(OWASP A06, docs/security-scans/2026-11-20-scan.md 재스캔).
-- 2) Supabase advisor 0028·0029: public 스키마 함수에는 anon·authenticated EXECUTE가 직접 붙으므로
--    0001의 `revoke ... from public`으로는 회수되지 않는다. 필요 없는 역할에서 직접 회수한다.
--    commit_analysis는 authenticated가 불러야 하므로 0029 경고 1건은 의도된 것이다.
--    가입 트리거는 실행 시점에 EXECUTE 권한을 보지 않으므로 handle_new_user 회수 후에도 동작한다.
-- 3) Supabase advisor 0003: RLS 정책의 auth.uid()를 (select auth.uid())로 바꿔 행마다 다시 평가하지 않게 한다.
-- 4) Supabase advisor 0001: reports.user_id 외래 키에 인덱스를 만든다.
-- create or replace는 기존 소유자·실행 권한을 그대로 유지한다.
create or replace function public.commit_analysis(
  p_report jsonb,
  p_transactions jsonb,
  p_month date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_count integer;
  v_report_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if jsonb_typeof(p_transactions) <> 'array'
     or jsonb_array_length(p_transactions) not between 1 and 3000 then
    raise exception 'Invalid transactions' using errcode = '22023';
  end if;

  if p_month is distinct from date_trunc('month', now() at time zone 'Asia/Seoul')::date then
    raise exception 'Invalid month' using errcode = '22023';
  end if;

  if octet_length(p_report::text) > 1000000 then
    raise exception 'Report too large' using errcode = '22023';
  end if;

  if octet_length(p_transactions::text) > 2000000
     or exists (select 1 from jsonb_array_elements(p_transactions) as entries(item)
                where length(item ->> 'merchant') > 500) then
    raise exception 'Transactions too large' using errcode = '22023';
  end if;

  -- src/lib/plan.ts getMonthlyLimit과 같은 값(schema.test.ts가 확인한다)
  select case plan when 'pro' then 30 else 3 end into v_limit
  from public.profiles where id = v_user_id;

  insert into public.usage (user_id, month, count)
  values (v_user_id, p_month, 0)
  on conflict (user_id, month) do nothing;

  -- 같은 사용자의 동시 저장은 이 잠금에서 줄을 서므로 한도를 넘기지 못한다.
  select count into v_count
  from public.usage
  where user_id = v_user_id and month = p_month
  for update;

  if v_count >= coalesce(v_limit, 0) then
    raise exception 'Quota exceeded' using errcode = 'P0001';
  end if;

  insert into public.reports (
    user_id, file_name, period_start, period_end,
    transaction_count, excluded_count, totals, insights
  ) values (
    v_user_id,
    p_report ->> 'file_name',
    (p_report ->> 'period_start')::date,
    (p_report ->> 'period_end')::date,
    (p_report ->> 'transaction_count')::integer,
    (p_report ->> 'excluded_count')::integer,
    p_report -> 'totals',
    p_report -> 'insights'
  ) returning id into v_report_id;

  insert into public.transactions (user_id, occurred_on, merchant, amount, category)
  select
    v_user_id,
    (item ->> 'occurred_on')::date,
    item ->> 'merchant',
    (item ->> 'amount')::bigint,
    item ->> 'category'
  from jsonb_array_elements(p_transactions) as entries(item);

  update public.usage set count = count + 1
  where user_id = v_user_id and month = p_month;

  return v_report_id;
end;
$$;

revoke execute on function public.commit_analysis(jsonb, jsonb, date) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;

alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);
alter policy reports_select_own on public.reports
  using ((select auth.uid()) = user_id);
alter policy reports_delete_own on public.reports
  using ((select auth.uid()) = user_id);
alter policy transactions_select_own on public.transactions
  using ((select auth.uid()) = user_id);
alter policy transactions_delete_own on public.transactions
  using ((select auth.uid()) = user_id);
alter policy usage_select_own on public.usage
  using ((select auth.uid()) = user_id);

create index reports_user_id_idx
  on public.reports (user_id);
