## review-code 요약
판정: Blocked

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 1 | 1 | 1 | 0 |

### 🔴🟠 지적
- [🔴 critical] src/components/PlanBadge.tsx:4 클라이언트 컴포넌트가 service role 클라이언트를 import
- [🟠 major] src/components/PlanBadge.tsx:12 admin 클라이언트로 `userId` prop 기준 `profiles`를 조회(IDOR)

GATE: critical=1 major=1 minor=1 nit=0

### src/components/PlanBadge.tsx:4
```
[🔴 critical] "use client" 컴포넌트가 service role 클라이언트를 import (R1)
TL;DR: `@/lib/supabase/admin`은 `server-only` 모듈이라 클라이언트 번들에 들어가면 빌드가 깨진다. 우회해서 번들에 들어가면 `SUPABASE_SERVICE_ROLE_KEY`가 브라우저에 노출되어, 누구나 RLS를 우회해 전체 사용자 데이터를 읽고 쓸 수 있다.
✓ Good: 플랜 표시를 `Badge`로 분리한 구성은 맞다.
→ Fix: 서버 컴포넌트가 세션 사용자의 플랜을 읽어 prop으로 내려준다.
```
```tsx
// src/components/PlanBadge.tsx (서버/클라이언트 구분 없는 순수 표시 컴포넌트)
import { Badge } from "./Badge";

export function PlanBadge({ plan }: { plan: "free" | "pro" }) {
  return <Badge variant={plan === "pro" ? "pro" : "default"}>{plan === "pro" ? "Pro" : "무료"}</Badge>;
}
// 호출하는 서버 컴포넌트(레이아웃 등)에서:
// const { plan } = await getSessionPlan();  → <PlanBadge plan={plan} />
```

### src/components/PlanBadge.tsx:12
```
[🟠 major] admin 클라이언트로 요청 값 `userId` 기준 profiles 조회 (S: IDOR)
TL;DR: admin 클라이언트는 RLS를 우회하므로, 호출자가 넘긴 `userId`로 다른 사용자의 `plan`을 읽을 수 있다. Pro 판단도 세션 기반 `profiles.plan`이 아니라 prop으로 들어온 id에 의존한다(R3 취지).
✓ Good: `profiles.plan` 값을 기준으로 표시하려는 방향은 맞다.
→ Fix: 세션 클라이언트(RLS 적용)로 본인 행만 읽는다.
```
```ts
const supabase = await createClient(); // 서버용 세션 클라이언트
const { data: { user } } = await supabase.auth.getUser();
const { data } = await supabase.from("profiles").select("plan").eq("id", user!.id).single();
```

### src/components/PlanBadge.tsx:1
```
[🟡 minor] 새 컴포넌트에 테스트 없음 (R8)
TL;DR: `src/components/`의 다른 컴포넌트는 모두 `*.test.tsx`가 있는데 `PlanBadge`만 없고, 프로젝트는 TDD를 요구한다.
✓ Good: 파일 위치(`src/components/`)와 한국어 문구("무료")는 관례에 맞다.
→ Fix:
```
```tsx
// src/components/PlanBadge.test.tsx
import { render, screen } from "@testing-library/react";
import { PlanBadge } from "./PlanBadge";

it("pro면 Pro, free면 무료를 보여 준다", () => {
  const { rerender } = render(<PlanBadge plan="pro" />);
  expect(screen.getByText("Pro")).toBeInTheDocument();
  rerender(<PlanBadge plan="free" />);
  expect(screen.getByText("무료")).toBeInTheDocument();
});
```

참고: 이 컴포넌트는 아직 어디에서도 import되지 않습니다. 라인 12의 `Pro` 영어 문구는 브랜드/플랜 이름이라 지적하지 않았습니다.

```json
{
  "verdict": "Blocked",
  "counts": { "critical": 1, "major": 1, "minor": 1, "nit": 0 },
  "comments": [
    { "path": "src/components/PlanBadge.tsx", "line": 4, "severity": "critical", "body": "[🔴 critical] \"use client\" 컴포넌트가 service role 클라이언트를 import (R1)\nTL;DR: `@/lib/supabase/admin`은 `server-only` 모듈이라 클라이언트 번들에 들어가면 빌드가 깨지고, 우회되면 `SUPABASE_SERVICE_ROLE_KEY`가 브라우저에 노출돼 누구나 RLS를 우회해 전체 사용자 데이터를 읽고 쓸 수 있다.\n✓ Good: 플랜 표시를 `Badge`로 분리한 구성은 맞다.\n→ Fix: 서버 컴포넌트에서 `getSessionPlan()`으로 plan을 읽고 `<PlanBadge plan={plan} />`로 prop 전달 (PlanBadge는 순수 표시 컴포넌트로)" },
    { "path": "src/components/PlanBadge.tsx", "line": 12, "severity": "major", "body": "[🟠 major] admin 클라이언트로 요청 값 `userId` 기준 profiles 조회 (S: IDOR)\nTL;DR: admin 클라이언트는 RLS를 우회하므로 호출자가 넘긴 `userId`로 다른 사용자의 `plan`을 읽을 수 있다.\n✓ Good: `profiles.plan`을 기준으로 표시하려는 방향은 맞다.\n→ Fix: 세션 클라이언트로 `supabase.auth.getUser()`의 본인 id만 `profiles`에서 `select(\"plan\")` 한다." },
    { "path": "src/components/PlanBadge.tsx", "line": 1, "severity": "minor", "body": "[🟡 minor] 새 컴포넌트에 테스트 없음 (R8)\nTL;DR: 다른 컴포넌트는 모두 `*.test.tsx`가 있는데 `PlanBadge`만 없고 프로젝트는 TDD를 요구한다.\n✓ Good: 위치와 한국어 문구는 관례에 맞다.\n→ Fix: `src/components/PlanBadge.test.tsx`에서 pro/free 렌더 결과를 검증한다." }
  ]
}
```