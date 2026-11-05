create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  period_start date not null,
  period_end date not null,
  transaction_count integer not null,
  excluded_count integer not null,
  totals jsonb not null,
  insights jsonb not null,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  merchant text not null,
  amount bigint not null,
  category text not null
);

create index transactions_user_occurred_on_idx
  on public.transactions (user_id, occurred_on);

create table public.usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  count integer not null default 0,
  primary key (user_id, month)
);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.transactions enable row level security;
alter table public.usage enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy reports_select_own on public.reports
  for select to authenticated using (auth.uid() = user_id);
create policy reports_delete_own on public.reports
  for delete to authenticated using (auth.uid() = user_id);

create policy transactions_select_own on public.transactions
  for select to authenticated using (auth.uid() = user_id);
create policy transactions_delete_own on public.transactions
  for delete to authenticated using (auth.uid() = user_id);

create policy usage_select_own on public.usage
  for select to authenticated using (auth.uid() = user_id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, plan)
  values (new.id, 'free');
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- JSON keys use DB column names. totals/insights contain the serialized report types;
-- bigint amounts must be serialized as decimal strings by the caller.
create function public.commit_analysis(
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
  v_report_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
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

  insert into public.usage (user_id, month, count)
  values (v_user_id, p_month, 1)
  on conflict (user_id, month) do update
    set count = public.usage.count + 1;

  return v_report_id;
end;
$$;

revoke all on function public.commit_analysis(jsonb, jsonb, date) from public;
grant execute on function public.commit_analysis(jsonb, jsonb, date) to authenticated;
