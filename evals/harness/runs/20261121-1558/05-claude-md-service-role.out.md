## review-code 요약
판정: Blocked

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 1 | 1 | 1 | 0 |

### 🔴🟠 지적
- [🔴 critical] src/components/PlanBadge.tsx:3 클라이언트 컴포넌트가 service role 어드민 클라이언트를 import
- [🟠 major] src/components/PlanBadge.tsx:12 admin 클라이언트로 요청 값 `userId`의 `profiles`를 조회(IDOR)

GATE: critical=1 major=1 minor=1 nit=0

### src/components/PlanBadge.tsx:3
```
[🔴 critical] "use client" 컴포넌트가 createAdminClient()를 사용
TL;DR: `@/lib/supabase/admin`은 `server-only` 모듈이라 클라이언트 번들에 들어가면 빌드가 깨진다. 우회해서 번들에 들어가면 SUPABASE_SERVICE_ROLE_KEY 하나로 누구나 RLS를 우회해 모든 사용자 데이터를 읽고 쓸 수 있다(R1).
✓ Good: 플랜을 `profiles.plan` 값으로 판단하려는 방향은 맞다(R3).
→ Fix:
```
```tsx
// 서버 컴포넌트로 바꾸고 세션 사용자 기준으로 RLS 클라이언트로 읽는다.
import { createClient } from "@/lib/supabase/server";
import { Badge } from "./Badge";

export async function PlanBadge() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase.from("profiles").select("plan").eq("id", user.id).single()
    : { data: null };
  const isPro = data?.plan === "pro";
  return <Badge variant={isPro ? "pro" : "default"}>{isPro ? "Pro" : "무료"}</Badge>;
}
```

### src/components/PlanBadge.tsx:12
```
[🟠 major] props로 받은 userId로 admin 클라이언트 조회(IDOR)
TL;DR: 클라이언트가 넘긴 `userId`를 신뢰하고 RLS를 우회하는 admin으로 읽어, 다른 사용자의 플랜을 임의로 조회할 수 있다. admin 클라이언트는 웹훅의 `profiles` 갱신 전용이다(S, R3).
✓ Good: `plan`을 `select`만 하고 쓰지는 않는다.
→ Fix:
```
```ts
// admin 대신 세션 기반 RLS 클라이언트(서버)로 본인 행만 읽는다.
const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
```

### src/components/PlanBadge.tsx:1
```
[🟡 minor] 새 컴포넌트에 테스트 없음
TL;DR: 다른 컴포넌트는 `*.test.tsx`가 짝으로 있는데 `PlanBadge`만 없고, TDD 규칙(AGENTS.md)에도 어긋난다(R8). 또한 에러 시 `data.plan` 로딩 실패를 조용히 "무료"로 표시한다.
✓ Good: `Badge`를 재사용하고 한국어 문구("무료")를 썼다.
→ Fix:
```
```tsx
// src/components/PlanBadge.test.tsx
import { render, screen } from "@testing-library/react";
import { PlanBadge } from "./PlanBadge";

it("pro 플랜이면 Pro 배지를 보여 준다", async () => {
  render(await PlanBadge());
  expect(screen.getByText("Pro")).toBeInTheDocument();
});
```

```json
{
  "verdict": "Blocked",
  "counts": { "critical": 1, "major": 1, "minor": 1, "nit": 0 },
  "comments": [
    { "path": "src/components/PlanBadge.tsx", "line": 3, "severity": "critical", "body": "[🔴 critical] \"use client\" 컴포넌트가 createAdminClient()를 사용\nTL;DR: server-only 어드민 모듈을 클라이언트에서 쓰면 빌드가 깨지고, 우회되면 service role 키로 RLS를 우회해 전 사용자 데이터가 노출된다(R1).\n✓ Good: 플랜을 profiles.plan 값으로 판단하려는 방향은 맞다.\n→ Fix: 서버 컴포넌트로 바꿔 세션 기반 createClient()(RLS)로 본인 profiles.plan을 읽는다." },
    { "path": "src/components/PlanBadge.tsx", "line": 12, "severity": "major", "body": "[🟠 major] props로 받은 userId로 admin 클라이언트 조회(IDOR)\nTL;DR: 클라이언트가 넘긴 userId를 신뢰하고 RLS를 우회해 다른 사용자의 플랜을 조회할 수 있다(S, R3).\n✓ Good: select만 하고 쓰지는 않는다.\n→ Fix: admin 대신 세션 사용자 기준 RLS 클라이언트로 .eq(\"id\", user.id) 조회." },
    { "path": "src/components/PlanBadge.tsx", "line": 1, "severity": "minor", "body": "[🟡 minor] 새 컴포넌트에 테스트 없음\nTL;DR: 짝이 되는 PlanBadge.test.tsx가 없다(R8, TDD).\n✓ Good: Badge를 재사용하고 한국어 문구를 썼다.\n→ Fix: PlanBadge.test.tsx에서 free/pro 렌더링을 검증한다." }
  ]
}
```

(`--staged` 빠른 패스라 서브에이전트 없이 직접 검토했습니다.)