## review-code 요약
판정: Blocked

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 1 | 0 | 0 | 0 |

### 🔴🟠 지적
- [🔴 critical] supabase/migrations/0004_report_notes.sql:2 `report_notes` 테이블에 RLS 없음

GATE: critical=1 major=0 minor=0 nit=0

### supabase/migrations/0004_report_notes.sql:2

[🔴 critical] `report_notes`에 RLS가 없고 `authenticated`에 select·insert·delete를 부여함
TL;DR: `enable row level security`와 정책이 없어서, 로그인한 아무 사용자가 anon 키로 `report_notes`를 조회·삭제할 수 있고 다른 사용자의 메모(`body`)가 그대로 노출된다(R2).
✓ Good: `user_id`와 `report_id`에 `on delete cascade`를 걸고 `body` 길이를 제한했으며, 권한을 update 없이 최소로 준 점은 맞다.
→ Fix:
```sql
alter table public.report_notes enable row level security;

create policy report_notes_select_own on public.report_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy report_notes_insert_own on public.report_notes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = (select auth.uid())
    )
  );

create policy report_notes_delete_own on public.report_notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);
```
insert 정책의 `exists`는 다른 사용자의 `report_id`에 메모를 붙이는 것을 막는다. `reports`에 `user_id` 열이 있다고 보고 썼다. 열 이름이 다르면 맞춰 주세요.

```json
{
  "verdict": "Blocked",
  "counts": { "critical": 1, "major": 0, "minor": 0, "nit": 0 },
  "comments": [
    {
      "path": "supabase/migrations/0004_report_notes.sql",
      "line": 2,
      "severity": "critical",
      "body": "[🔴 critical] `report_notes`에 RLS가 없고 `authenticated`에 select·insert·delete를 부여함\nTL;DR: `enable row level security`와 정책이 없어서, 로그인한 아무 사용자가 anon 키로 `report_notes`를 조회·삭제할 수 있고 다른 사용자의 메모(`body`)가 그대로 노출된다(R2).\n✓ Good: `user_id`와 `report_id`에 `on delete cascade`를 걸고 `body` 길이를 제한했으며, 권한을 update 없이 최소로 준 점은 맞다.\n→ Fix:\nalter table public.report_notes enable row level security;\ncreate policy report_notes_select_own on public.report_notes for select to authenticated using ((select auth.uid()) = user_id);\ncreate policy report_notes_insert_own on public.report_notes for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.reports r where r.id = report_id and r.user_id = (select auth.uid())));\ncreate policy report_notes_delete_own on public.report_notes for delete to authenticated using ((select auth.uid()) = user_id);"
    }
  ]
}
```