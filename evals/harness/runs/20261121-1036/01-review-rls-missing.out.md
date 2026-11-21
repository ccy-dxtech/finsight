## review-code 요약
판정: Blocked

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 1 | 0 | 1 | 0 |

### 🔴🟠 지적
- [🔴 critical] supabase/migrations/0004_report_notes.sql:2 새 테이블 `report_notes`에 RLS 없음

GATE: critical=1 major=0 minor=1 nit=0

`--staged` 빠른 패스라 서브에이전트 없이 correctness, security, conventions를 한 번에 봤습니다. staged된 변경은 `0004_report_notes.sql` 하나입니다. `AGENTS.md`와 `docs/BROWSER_TESTING.md`는 staged가 아니어서 리뷰하지 않았습니다.

### supabase/migrations/0004_report_notes.sql:2

````
[🔴 critical] 새 테이블 `report_notes`에 RLS가 없음
TL;DR: `enable row level security`와 정책 없이 `authenticated`에 `select, insert, delete`를 grant했습니다. 로그인한 아무 사용자나 모든 사용자의 리포트 메모를 읽고 지울 수 있습니다. (R2)
✓ Good: `user_id`를 `auth.users`에 `on delete cascade`로 묶고 `body` 길이를 check로 제한한 점은 맞습니다.
→ Fix:
```sql
alter table public.report_notes enable row level security;

create policy "report_notes_select_own" on public.report_notes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "report_notes_insert_own" on public.report_notes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );

create policy "report_notes_delete_own" on public.report_notes
  for delete to authenticated
  using (auth.uid() = user_id);
```
````

### supabase/migrations/0004_report_notes.sql:13

````
[🟡 minor] 다른 사용자의 `report_id`로 메모를 만들 수 있음
TL;DR: `report_id`가 본인 리포트인지 검사하는 곳이 없습니다. 위 insert 정책의 `exists` 조건을 넣지 않으면 남의 리포트 id로 행을 만들 수 있고, FK 오류 여부로 그 id가 있는지 알아낼 수 있습니다.
✓ Good: `(user_id, report_id)` 인덱스가 조회 패턴에 맞습니다.
→ Fix:
```sql
-- 위 report_notes_insert_own 정책의 with check에 포함된 exists 조건을 유지
```
````

```json
{
  "verdict": "Blocked",
  "counts": { "critical": 1, "major": 0, "minor": 1, "nit": 0 },
  "comments": [
    {
      "path": "supabase/migrations/0004_report_notes.sql",
      "line": 2,
      "severity": "critical",
      "body": "[🔴 critical] 새 테이블 `report_notes`에 RLS가 없음\nTL;DR: `enable row level security`와 정책 없이 `authenticated`에 `select, insert, delete`를 grant해, 로그인한 아무 사용자나 모든 사용자의 리포트 메모를 읽고 지울 수 있다. (R2)\n✓ Good: `user_id`를 `auth.users`에 `on delete cascade`로 묶고 `body` 길이를 check로 제한한 점은 맞다.\n→ Fix:\n```sql\nalter table public.report_notes enable row level security;\n\ncreate policy \"report_notes_select_own\" on public.report_notes\n  for select to authenticated\n  using (auth.uid() = user_id);\n\ncreate policy \"report_notes_insert_own\" on public.report_notes\n  for insert to authenticated\n  with check (\n    auth.uid() = user_id\n    and exists (\n      select 1 from public.reports r\n      where r.id = report_id and r.user_id = auth.uid()\n    )\n  );\n\ncreate policy \"report_notes_delete_own\" on public.report_notes\n  for delete to authenticated\n  using (auth.uid() = user_id);\n```"
    },
    {
      "path": "supabase/migrations/0004_report_notes.sql",
      "line": 13,
      "severity": "minor",
      "body": "[🟡 minor] 다른 사용자의 `report_id`로 메모를 만들 수 있음\nTL;DR: `report_id`가 본인 리포트인지 검사하는 곳이 없어, insert 정책에 `exists` 조건이 없으면 남의 리포트 id로 행을 만들고 FK 오류로 id 존재 여부를 알아낼 수 있다.\n✓ Good: `(user_id, report_id)` 인덱스가 조회 패턴에 맞다.\n→ Fix:\n```sql\n-- report_notes_insert_own 정책의 with check에 exists 조건을 포함\n```"
    }
  ]
}
```