## security-scan 요약 (OWASP Top 10 2025)
판정: **Blocked**

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 2 | 0 | 2 | 0 |

| OWASP | 결과 | 확인한 것 |
|---|---|---|
| A01 Broken Access Control | 이상 없음 | 4개 테이블 모두 RLS가 켜져 있고 정책은 select·delete뿐입니다. `security definer` 함수에는 `set search_path`가 있습니다. admin 클라이언트는 웹훅에서만 쓰고, 모든 `redirect`는 `safeNextPath`를 거칩니다. |
| A02 Security Misconfiguration | 3건 | service role 키를 `NEXT_PUBLIC_` 이름으로 읽고 안내하는 곳이 있습니다. `next.config.ts`에는 보안 헤더가 없습니다. 비밀을 읽는 모듈에는 모두 `server-only`가 있습니다. |
| A03 Software Supply Chain | 이상 없음 | `postinstall`과 이름을 흉내 낸 패키지가 없습니다. 워크플로는 action을 SHA로 고정하고 `permissions`를 명시하며, `npm ci --ignore-scripts`로 실행합니다. |
| A04 Cryptographic Failures | 이상 없음 | 하드코딩된 비밀값, URL에 실린 토큰, 직접 만든 쿠키가 없습니다. |
| A05 Injection | 이상 없음 | `.or()` 문자열 연결, 동적 SQL, `dangerouslySetInnerHTML`, `eval`이 없습니다. AI 응답은 zod 스키마와 거래 id 참조로 제한됩니다. |
| A06 Insecure Design | 이상 없음 | 원본 파일을 저장하지 않습니다. 파일 4MB와 거래 3,000건 상한이 있고, 한도는 서버(analyze 라우트와 `commit_analysis` RPC)에서 확인합니다. |
| A07 Authentication Failures | 이상 없음 | 모든 인증이 `getUser()` 기반입니다. 사용자 id는 세션에서만 받고, `auth/callback`은 `next`를 검증합니다. |
| A08 Data Integrity Failures | 1건 | 웹훅 서명 검증 경로를 거치고 `product_id`를 검사합니다. 다만 `webhookSecret`이 빈 값일 때의 처리가 없습니다. |
| A09 Logging & Alerting | 이상 없음 | `console.*` 호출이 없고, 웹훅 쓰기 실패는 throw로 올라갑니다. |
| A10 Exceptional Conditions | 이상 없음 | 오류 응답은 고정 문구입니다. 인증·플랜 조회 실패는 fail-closed이고, 보안 경로 쓰기는 `error`를 확인합니다. |

### 🔴🟠 지적
- [🔴 critical] A02 · src/lib/supabase/admin.ts:7 service role 키를 `NEXT_PUBLIC_` 변수에서 읽음
- [🔴 critical] A02 · .env.example:3 `.env.example`이 service role 키를 `NEXT_PUBLIC_` 이름으로 안내함

GATE: critical=2 major=0 minor=2 nit=0

---

### [🔴 critical] A02 · src/lib/supabase/admin.ts:7 service role 키를 `NEXT_PUBLIC_` 변수에서 읽음
근거: `const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;` 줄을 직접 열어 확인했습니다. R1 탐지 신호(`NEXT_PUBLIC_` 이름에 `SERVICE_ROLE`)에 그대로 해당합니다.
악용: 이 폴백이 있으면 service role 키를 공개 변수 이름으로 둔 배포가 그대로 동작합니다. Vercel은 `NEXT_PUBLIC_` 변수를 공개 값으로 취급하므로 키가 노출될 수 있습니다. 이 모듈은 `server-only`라 지금 코드만으로 번들에 인라인되지는 않지만, R1의 기본 심각도를 따라 🔴로 둡니다. 키를 얻은 사람은 RLS를 우회해 모든 사용자의 데이터를 읽거나 지우고 `profiles.plan`을 바꿀 수 있습니다.
→ Fix:
```ts
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다.");
}
// 이미 NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY를 만들어 뒀다면
// Supabase 대시보드에서 키를 재발급(rotate)하고 그 변수는 삭제한다.
```

### [🔴 critical] A02 · .env.example:3 `.env.example`이 service role 키를 `NEXT_PUBLIC_` 이름으로 안내함
근거: `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=`
악용: 이 파일을 복사해 `.env.local`과 Vercel 환경 변수를 채우는 사람은 service role 키를 공개 변수에 넣게 됩니다. 위 폴백이 그 값을 읽으므로, 안내를 따를수록 노출 위험이 커집니다.
→ Fix:
```
SUPABASE_SERVICE_ROLE_KEY=
```

### [🟡 minor] A08 · src/app/api/webhooks/polar/route.ts:19 웹훅 비밀값이 비어 있어도 그대로 서명 검증에 쓰임
근거: `webhookSecret: process.env.POLAR_WEBHOOK_SECRET!`를 확인했고, `.env.example:10`은 `POLAR_WEBHOOK_SECRET=` 빈 값으로 안내합니다.
악용: 비밀값을 채우지 않고 배포하면 서명 검증이 빈 키로 실행될 수 있습니다. 이 경우 공격자가 `subscription.active` 이벤트를 위조해 `profiles.plan`을 `pro`로 바꿀 수 있습니다. 설정 누락이 전제입니다. 이 worktree에는 `node_modules`가 없어 SDK가 빈 값을 거부하는지 확인하지 못했고, 그래서 한 단계 낮췄습니다. `applySubscriptionEvent`의 `product_id` 검사는 정상 구성에서 유효합니다.
→ Fix:
```ts
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
if (!webhookSecret) throw new Error("POLAR_WEBHOOK_SECRET 환경 변수가 필요합니다.");

export async function POST(request: NextRequest) {
  return Webhooks({
    webhookSecret,
    onSubscriptionActive: applyEvent,
    onSubscriptionRevoked: applyEvent,
  })(request);
}
```

### [🟡 minor] A02 · next.config.ts:3 보안 헤더(CSP, X-Frame-Options, X-Content-Type-Options)가 없음
근거: `nextConfig`에 `headers()`가 없습니다. 파일을 직접 열어 확인했습니다.
악용: 외부 사이트가 대시보드를 iframe에 넣어 클릭재킹을 시도할 수 있습니다. 직접적인 악용 경로는 조건부라 심층 방어 부족(minor)으로 봅니다.
→ Fix:
```ts
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  }];
},
```

```json
{
  "verdict": "Blocked",
  "counts": { "critical": 2, "major": 0, "minor": 2, "nit": 0 },
  "coverage": [
    { "owasp": "A01", "result": "이상 없음" },
    { "owasp": "A02", "result": "3건" },
    { "owasp": "A03", "result": "이상 없음" },
    { "owasp": "A04", "result": "이상 없음" },
    { "owasp": "A05", "result": "이상 없음" },
    { "owasp": "A06", "result": "이상 없음" },
    { "owasp": "A07", "result": "이상 없음" },
    { "owasp": "A08", "result": "1건" },
    { "owasp": "A09", "result": "이상 없음" },
    { "owasp": "A10", "result": "이상 없음" }
  ],
  "findings": [
    { "owasp": "A02", "path": "src/lib/supabase/admin.ts", "line": 7, "severity": "critical", "rule": "R1", "title": "service role 키를 NEXT_PUBLIC_ 변수에서 읽음", "evidence": "const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;", "scenario": "공개 변수 이름으로 둔 service role 키가 노출되면 RLS를 우회해 전체 사용자 데이터를 읽고 쓰고 profiles.plan을 바꿀 수 있다.", "fix": "const key = process.env.SUPABASE_SERVICE_ROLE_KEY; 만 읽고, 이미 만든 공개 변수의 키는 재발급 후 삭제한다." },
    { "owasp": "A02", "path": ".env.example", "line": 3, "severity": "critical", "rule": "R1", "title": ".env.example가 service role 키를 NEXT_PUBLIC_ 이름으로 안내함", "evidence": "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=", "scenario": "예시 파일을 따라 채운 개발자가 service role 키를 공개 변수에 넣어 노출 위험이 생긴다.", "fix": "SUPABASE_SERVICE_ROLE_KEY=" },
    { "owasp": "A08", "path": "src/app/api/webhooks/polar/route.ts", "line": 19, "severity": "minor", "rule": "R4", "title": "웹훅 비밀값이 비어 있어도 그대로 서명 검증에 쓰임", "evidence": "webhookSecret: process.env.POLAR_WEBHOOK_SECRET!", "scenario": "비밀값 없이 배포하면 위조 웹훅으로 profiles.plan을 pro로 바꿀 수 있다. 설정 누락이 전제이고 SDK 동작은 확인하지 못했다.", "fix": "비밀값이 없으면 모듈 로드 시점에 throw한다." },
    { "owasp": "A02", "path": "next.config.ts", "line": 3, "severity": "minor", "rule": null, "title": "보안 헤더가 없음", "evidence": "nextConfig에 headers()가 없음", "scenario": "외부 사이트가 iframe으로 감싸 클릭재킹을 시도할 수 있다.", "fix": "headers()에 nosniff, X-Frame-Options DENY, frame-ancestors 'none'을 추가한다." }
  ]
}
```

수정은 사람이 건별로 승인한 뒤 적용합니다. 이 스킬은 파일을 고치지 않습니다.