## security-scan 요약 (OWASP Top 10 2025)
판정: **Blocked**

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 2 | 1 | 3 | 0 |

| OWASP | 결과 | 확인한 것 |
|---|---|---|
| A01 Broken Access Control | 이상 없음 | 4개 테이블 RLS와 정책, `security definer` 함수 2개, `app/api`의 세션 사용자 조회, admin 클라이언트 용도, `safeNextPath` 사용 |
| A02 Security Misconfiguration | 3건 | `NEXT_PUBLIC_` 변수 이름, `"use client"`의 admin·services import, `server-only`, 보안 헤더, `.env.example` |
| A03 Software Supply Chain Failures | 이상 없음 | `postinstall` 스크립트와 이름 흉내 패키지 없음, 워크플로 action은 SHA로 고정, `permissions` 제한, `pull_request_target` 미사용 |
| A04 Cryptographic Failures | 이상 없음 | 하드코딩된 비밀값, 쿼리스트링의 비밀값, 직접 만든 쿠키 |
| A05 Injection | 이상 없음 | `.or()`·`.filter()` 문자열 조립, 동적 SQL, `dangerouslySetInnerHTML`, `eval`, AI 응답 스키마(zod, id 참조) |
| A06 Insecure Design | 2건 | 원본·불필요한 열 저장 없음, 4MB·3,000건·월 한도는 서버에서 검사, xlsx 범위와 PDF 쪽 수는 상한 없음 |
| A07 Authentication Failures | 이상 없음 | `getUser()` 사용, 사용자 id는 세션에서만 얻음, `auth/callback` 처리, `proxy.ts` 보호 경로 |
| A08 Software or Data Integrity Failures | 1건 | 웹훅 서명 검증 SDK와 `product_id` 비교는 있음, `webhookSecret` 빈 값은 막지 않음 |
| A09 Logging & Alerting Failures | 이상 없음 | `console.*` 호출 없음, 웹훅 DB 쓰기 오류를 throw함 |
| A10 Mishandling of Exceptional Conditions | 이상 없음 | `error.tsx`에 오류 내용 노출 없음, fail-open 없음, 보안 경로의 Supabase `error` 확인 |

### 🔴🟠 지적
- [🔴 critical] A02 · src/lib/supabase/admin.ts:7 service role 키를 `NEXT_PUBLIC_` 변수에서도 읽음
- [🔴 critical] A02 · .env.example:3 `.env.example`이 service role 키를 `NEXT_PUBLIC_` 이름으로 안내함
- [🟠 major] A08 · src/app/api/webhooks/polar/route.ts:19 웹훅 비밀값이 빈 문자열이어도 라우트가 동작함

GATE: critical=2 major=1 minor=3 nit=0

---

### [🔴 critical] A02 · src/lib/supabase/admin.ts:7 service role 키를 `NEXT_PUBLIC_` 변수에서도 읽음
근거: `const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;` R1 탐지 신호("`NEXT_PUBLIC_` 이름에 `SERVICE_ROLE`")에 해당합니다. AGENTS.md도 이를 금지합니다.
악용: 운영자가 이 코드와 `.env.example`을 따라 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`를 설정하면 공개 변수 이름으로 키가 퍼집니다. 클라이언트 번들이 이 값을 참조하게 되는 순간 익명 방문자가 키를 꺼내 RLS를 우회하고 `profiles.plan`을 `pro`로 바꾸거나 모든 사용자 데이터를 읽고 지울 수 있습니다. 지금은 `server-only` 모듈이라 즉시 번들에 실리지는 않지만, 이름 자체가 구조적 유출 위험입니다.
→ Fix:
```ts
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다.");
}
```
이미 `NEXT_PUBLIC_` 이름으로 키를 설정한 적이 있다면 키를 교체(rotate)하세요. `admin.ts:6`의 "공개 변수로도 읽는다" 주석도 함께 지워야 합니다.

### [🔴 critical] A02 · .env.example:3 `.env.example`이 service role 키를 `NEXT_PUBLIC_` 이름으로 안내함
근거: `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=`
악용: 새 개발자나 배포 담당자가 템플릿을 복사해 service role 키를 공개 변수 이름으로 넣습니다. 이 값이 클라이언트 번들이나 빌드 로그로 새면 누구나 관리자 권한을 얻습니다.
→ Fix:
```
SUPABASE_SERVICE_ROLE_KEY=
```

### [🟠 major] A08 · src/app/api/webhooks/polar/route.ts:19 웹훅 비밀값이 빈 문자열이어도 라우트가 동작함
근거: `webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,` non-null 단언뿐이고 빈 값 검사가 없습니다. `.env.example`의 `POLAR_WEBHOOK_SECRET=`을 그대로 복사하면 빈 문자열이 됩니다.
악용: 배포 환경에서 이 값이 비어 있고 SDK가 빈 키를 허용하면, 공격자가 빈 키로 서명한 `subscription.active` 이벤트를 위조해 결제 없이 `profiles.plan='pro'`를 얻을 수 있습니다. 이 worktree에는 `node_modules`가 설치돼 있지 않아 SDK의 빈 시크릿 처리는 확인하지 못했습니다. 그래서 R4 기본 심각도(🔴)에서 한 단계 낮췄습니다.
→ Fix:
```ts
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response(null, { status: 500 });
  return Webhooks({
    webhookSecret,
    onSubscriptionActive: applyEvent,
    onSubscriptionRevoked: applyEvent,
  })(request);
}
```

### [🟡 minor] A06 · src/lib/statement/parse.ts:32 xlsx 시트 선언 범위를 상한 없이 펼침
근거: `XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true, range: 0 })` 3,000건 상한은 `normalize.ts:67`에서 파싱이 끝난 뒤에야 걸립니다.
악용: 로그인한 사용자가 `<dimension ref="A1:XFD1048576"/>`만 넣은 수 KB짜리 `.xlsx`를 `/api/analyze`에 올립니다. 서버가 빈 셀을 대량으로 만들며 최대 300초 동안 함수를 점유하거나 메모리가 부족해지고, 실패는 횟수에서 차감되지 않아 반복할 수 있습니다.
→ Fix:
```ts
const MAX_SHEET_ROWS = 5000;
const MAX_SHEET_COLS = 50;
const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
range.s.r = 0;
range.e.r = Math.min(range.e.r, MAX_SHEET_ROWS - 1);
range.e.c = Math.min(range.e.c, range.s.c + MAX_SHEET_COLS - 1);
return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true, range });
```

### [🟡 minor] A06 · src/lib/statement/pdf.ts:117 PDF 쪽 수 상한 없이 모든 쪽의 글자를 추출함
근거: `const { items } = await extractTextItems(new Uint8Array(buffer));` 4MB 크기 검사만 있고 쪽 수 확인이 없습니다.
악용: 로그인한 사용자가 4MB 안에서 수천 쪽이 같은 스트림을 참조하도록 만든 PDF를 올리면 글자 추출과 열 복원이 오래 걸려 함수를 장시간 점유합니다. 실패는 횟수에서 차감되지 않아 반복할 수 있습니다.
→ Fix:
```ts
import { extractTextItems, getDocumentProxy } from "unpdf";
const MAX_PDF_PAGES = 100;
export async function readPdfRows(buffer: ArrayBuffer): Promise<string[][]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  if (pdf.numPages > MAX_PDF_PAGES) throw new Error("too_many_pages");
  const { items } = await extractTextItems(pdf);
  return textItemsToRows(items);
}
```

### [🟡 minor] A02 · next.config.ts:3 보안 헤더(CSP, frame-ancestors, X-Content-Type-Options)가 없음
근거: `headers()` 설정이 없습니다. 루브릭이 이 경우를 🟡로 정해 두었습니다.
악용: 공격자가 다른 사이트의 iframe에 대시보드나 결제 화면을 넣어 클릭재킹으로 결제·삭제 버튼을 누르게 유도할 수 있고, MIME 스니핑도 막혀 있지 않습니다.
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
  "counts": { "critical": 2, "major": 1, "minor": 3, "nit": 0 },
  "coverage": [
    { "owasp": "A01", "result": "이상 없음" },
    { "owasp": "A02", "result": "3건" },
    { "owasp": "A03", "result": "이상 없음" },
    { "owasp": "A04", "result": "이상 없음" },
    { "owasp": "A05", "result": "이상 없음" },
    { "owasp": "A06", "result": "2건" },
    { "owasp": "A07", "result": "이상 없음" },
    { "owasp": "A08", "result": "1건" },
    { "owasp": "A09", "result": "이상 없음" },
    { "owasp": "A10", "result": "이상 없음" }
  ],
  "findings": [
    { "owasp": "A02", "path": "src/lib/supabase/admin.ts", "line": 7, "severity": "critical", "rule": "R1", "title": "service role 키를 NEXT_PUBLIC_ 변수에서도 읽음", "evidence": "const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;", "scenario": "운영자가 공개 변수 이름으로 키를 설정하고 클라이언트 번들이 참조하게 되면 방문자가 키를 꺼내 RLS를 우회하고 plan을 pro로 바꾸거나 전체 사용자 데이터를 읽고 지운다.", "fix": "const key = process.env.SUPABASE_SERVICE_ROLE_KEY;" },
    { "owasp": "A02", "path": ".env.example", "line": 3, "severity": "critical", "rule": "R1", "title": ".env.example이 service role 키를 NEXT_PUBLIC_ 이름으로 안내함", "evidence": "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=", "scenario": "템플릿을 따라 service role 키를 공개 변수 이름으로 넣으면 번들·빌드 로그로 유출되어 누구나 관리자 권한을 얻는다.", "fix": "SUPABASE_SERVICE_ROLE_KEY=" },
    { "owasp": "A08", "path": "src/app/api/webhooks/polar/route.ts", "line": 19, "severity": "major", "rule": "R4", "title": "웹훅 비밀값이 빈 문자열이어도 라우트가 동작함", "evidence": "webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,", "scenario": "시크릿이 비어 있고 SDK가 빈 키를 허용하면 위조한 subscription.active 이벤트로 결제 없이 plan을 pro로 만든다. SDK 동작은 node_modules 부재로 확인하지 못해 한 단계 낮췄다.", "fix": "const webhookSecret = process.env.POLAR_WEBHOOK_SECRET; if (!webhookSecret) return new Response(null, { status: 500 });" },
    { "owasp": "A06", "path": "src/lib/statement/parse.ts", "line": 32, "severity": "minor", "rule": null, "title": "xlsx 시트 선언 범위를 상한 없이 펼침", "evidence": "sheet_to_json(sheet, { header: 1, raw: false, defval: \"\", blankrows: true, range: 0 })", "scenario": "선언 범위만 거대한 작은 xlsx를 반복 업로드해 함수를 최대 300초 점유하거나 메모리를 소진시킨다.", "fix": "decode_range로 행·열 상한을 두고 range에 넘긴다." },
    { "owasp": "A06", "path": "src/lib/statement/pdf.ts", "line": 117, "severity": "minor", "rule": null, "title": "PDF 쪽 수 상한 없이 모든 쪽의 글자를 추출함", "evidence": "const { items } = await extractTextItems(new Uint8Array(buffer));", "scenario": "4MB 안에서 수천 쪽으로 펼쳐지는 PDF를 반복 업로드해 함수를 장시간 점유한다.", "fix": "getDocumentProxy로 numPages를 확인해 100쪽 초과면 거부한다." },
    { "owasp": "A02", "path": "next.config.ts", "line": 3, "severity": "minor", "rule": null, "title": "보안 헤더가 설정되지 않음", "evidence": "headers() 없음", "scenario": "iframe 삽입으로 클릭재킹, MIME 스니핑이 가능하다.", "fix": "headers()에 X-Content-Type-Options, X-Frame-Options, CSP frame-ancestors를 추가한다." }
  ]
}
```

수정은 사람이 건별로 승인한 뒤 적용합니다. 이 스킬은 파일을 고치지 않습니다.