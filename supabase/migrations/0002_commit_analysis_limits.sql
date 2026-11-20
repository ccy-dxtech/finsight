-- commit_analysis에 한도·건수·월·크기 검사를 넣는다(OWASP A06, docs/security-scans/2026-11-20-scan.md).
-- RPC는 authenticated에 열려 있어 브라우저에서 직접 부르면 라우트의 검사를 건너뛸 수 있었다.
-- 라우트의 사전 한도 확인(AI 비용 보호)은 그대로 두고, 이 함수가 최종 확인을 한다(ADR-009).
-- create or replace는 기존 소유자·실행 권한(authenticated만)을 그대로 유지한다.
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
