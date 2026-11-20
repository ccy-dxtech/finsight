---
name: security-scan
description: FinSight 저장소 전체(diff가 아니라 repo 전부)를 OWASP Top 10(2025) 루브릭과 FinSight 룰(docs/REVIEW_RULES.md R1~R10·S)로 스캔해 누적·구조적 보안 취약점을 심각도 4단계·OWASP 코드·파일:줄·근거·수정안으로 보고한다. 파일은 고치지 않는다. "/security-scan", "보안 스캔", "OWASP 점검", "전체 보안 점검", "재스캔"을 요청받았을 때 쓴다.
---

# security-scan

`/review-code`는 diff만 본다. 이 스킬은 나머지 절반, 저장소 전체를 본다.
심각도·판정·`GATE:` 형식은 `docs/REVIEW_RULES.md`를 따르고, 무엇을 볼지는 아래 OWASP 루브릭이 정한다.

**이 스킬은 파일을 고치지 않는다.** 보안 수정은 사람이 건별로 승인한 뒤에만 적용한다.

## 1. 스캔 대상

| 포함 | 제외 |
|---|---|
| `src/` (`*.test.ts`·`*.test.tsx` 제외), `supabase/migrations/`, `.github/`, `package.json`, `next.config.ts`, `src/proxy.ts`, `.env.example` | `tests/`, `**/*.test.*`, `docs/`, `.claude/`, `.agents/`, `node_modules/`, `npm audit`, 원격 DB |

- `.env.local`은 읽지 않는다.
- `docs/PRD.md`의 "## 한계"에 적힌 항목은 이미 받아들인 위험이다. 지적하지 않는다. 예: 웹훅 순서·중복은 처리하지 않음, 두 탭에서 동시에 분석하면 한도를 넘길 수 있음, 열 매핑 때 상단 행 텍스트가 AI에 전달됨.
- `docs/REVIEW_RULES.md` "리뷰 범위"의 "diff에 들어온 줄만 지적한다"는 이 스킬에서 "스캔 대상 전체를 지적한다"로 바꿔 읽는다. 나머지 규칙은 그대로 따른다. 외부 SDK 지적은 `node_modules`로 확인하고, 확신이 없으면 한 단계 낮추고, 🔴는 악용 시나리오를 한 문장으로 쓸 수 있을 때만 단다.

## 2. OWASP Top 10 (2025) 루브릭

탐지 신호에 걸리지 않으면 그 항목으로 지적하지 않는다. 대응 룰이 있으면 그 룰의 기본 심각도가 우선한다. 룰이 없으면 REVIEW_RULES S 절의 "플러그인 등급 → 4단계" 표로 정한다.

| 코드 | 이름 | 묶음 | FinSight 탐지 신호 | 대응 룰 |
|---|---|---|---|---|
| A01 | Broken Access Control | 1 | `create table public.*`에 짝이 되는 `enable row level security`가 없음. 정책이 `auth.uid() = user_id`(또는 `id`)가 아니거나 `using (true)`임. `profiles`·`usage`에 사용자 `insert`·`update` 정책이 있음. `security definer` 함수에 `set search_path`가 없거나, 사용자 id를 인자로 받거나, `anon`·`public`에 `execute`를 줌. `app/api/**`가 요청 값(`id`, `userId`)으로 행을 찾으면서 세션 사용자로 좁히지 않음(IDOR). admin 클라이언트로 사용자 데이터를 조회. Pro 기능을 `profiles.plan` 말고 다른 값으로 엶. `redirect()`에 `next`·`returnTo`를 `lib/auth/safe-next.ts` 없이 넣음. 사용자 값이 들어간 URL로 서버가 `fetch`(SSRF) | R2, R3, S(IDOR·오픈 리다이렉트·SSRF) |
| A02 | Security Misconfiguration | 3 | `NEXT_PUBLIC_` 이름에 `ANTHROPIC`·`SERVICE_ROLE`·`POLAR`가 들어감. `"use client"` 파일이 `@/lib/supabase/admin`·`@/services/*`를 import함. 비밀값을 읽는 모듈에 `import "server-only"`가 없음. `next.config.ts`에 보안 헤더(CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`)가 없음(🟡). `.env.example`에 실제 값이 들어 있음 | R1 |
| A03 | Software Supply Chain Failures | 3 | `package.json`에 이름을 흉내 낸 패키지나 `postinstall`·`preinstall` 스크립트가 있음. 워크플로가 서드파티 action을 SHA가 아닌 태그로 고정함. `run:`에 `${{ github.event.* }}` 같은 PR 값을 직접 넣음. 워크플로 `permissions`가 필요 이상이거나 생략됨. `pull_request_target`에서 PR 코드를 체크아웃함 | S(GitHub Actions) |
| A04 | Cryptographic Failures | 2 | `sk-ant-`·`sk_`·`polar_`·JWT(`eyJ`) 같은 값이 소스·마이그레이션·워크플로에 하드코딩됨. 비밀값·토큰이 URL·쿼리스트링에 실림. 직접 만든 쿠키에 `secure`·`httpOnly`·`sameSite`가 없음 | S(하드코딩된 비밀값) |
| A05 | Injection | 2 | Supabase `.or()`·`.filter()`·`.textSearch()` 문자열에 사용자 입력을 이어 붙임. SQL 함수에서 `execute format(...)`·문자열 연결로 동적 SQL을 실행함. `dangerouslySetInnerHTML`을 쓰거나 AI 응답·가맹점명을 HTML·Markdown으로 직접 조립함. `eval`·`new Function`, 사용자 값이 들어간 `child_process`. 가맹점명 같은 파일 내용이 프롬프트 지시로 읽혀 구조화 출력·id 참조를 우회할 수 있음 | S(XSS·동적 코드 실행) |
| A06 | Insecure Design | 2 | 업로드 원본이나 파싱 전 행을 Storage·`fs.writeFile`·DB·로그에 남김. 날짜·가맹점·금액 외의 열(카드번호, 이름)을 저장함. 업로드·파싱에 크기·행 수·쪽 수 상한이 없어 한 요청이 서버를 오래 점유함. 한도·과금 확인을 클라이언트만 함 | R7, S(위험한 자원 소모) |
| A07 | Authentication Failures | 1 | 라우트 핸들러·서버 컴포넌트가 `getUser()`(또는 `getClaims()`) 없이 쿠키만 믿는 `getSession()`으로 인증을 판단함. 사용자 id·역할을 body·쿼리·헤더에서 받음(Polar external customer id 포함). `auth/callback`이 `code` 교환 실패를 처리하지 않거나 `next`를 검증하지 않음. `src/proxy.ts`가 보호 경로에서 세션을 확인하지 않음 | S(위조 가능한 값·OAuth 흐름) |
| A08 | Software or Data Integrity Failures | 2 | 웹훅 라우트가 `Webhooks({ webhookSecret })`·`validateEvent`를 거치지 않고 `request.json()`·`request.text()` 결과로 DB를 바꿈. `webhookSecret`이 빈 값일 수 있음. `profiles.plan`을 바꾸는 경로에 `product_id === POLAR_PRO_PRODUCT_ID` 검사가 없음. 외부 JSON(AI 응답·웹훅)을 스키마 검증 없이 씀 | R4, R9 |
| A09 | Logging & Alerting Failures | 3 | `console.*`에 토큰, 거래 원문, 이메일, 비밀값을 남김. 보안 관련 실패(웹훅 처리·플랜 갱신·인증 실패)를 기록 없이 삼키고 성공처럼 응답함 | S(로그·오류의 비밀값·개인정보) |
| A10 | Mishandling of Exceptional Conditions | 3 | API 오류 응답이나 `error.tsx`에 스택·`error.message`·내부 정보가 노출됨. `catch` 뒤 fail-open(인증 통과, Pro 처리, 한도 무시). 보안 경로(웹훅·플랜·삭제)의 Supabase 쓰기에서 `error`를 확인하지 않음 | R10(보안 경로만) |

묶음 1은 접근통제·인증(A01, A07), 묶음 2는 데이터·주입·무결성(A04, A05, A06, A08), 묶음 3은 설정·공급망·로깅·예외(A02, A03, A09, A10)다.

## 3. 세 서브에이전트를 한 메시지에서 병렬로 띄우기

Agent 도구(`subagent_type: general-purpose`)를 **한 응답에 세 번** 호출한다. 저장소가 작아도 건너뛰지 않는다. 묶음별로 따로 보는 것이 이 스캔의 기준이다.

공통 프롬프트 틀(`<묶음>`, `<OWASP 코드>`만 바꾼다):

```
너는 FinSight 보안 스캐너다. 저장소 전체에서 <OWASP 코드>만 본다. 다른 항목은 다른 스캐너가 보니 지적하지 마라.
파일을 고치지 마라. `.env.local`은 읽지 마라. Bash는 읽기 전용 명령(git ls-files, git grep, git log)에만 써라.

1. .claude/skills/security-scan/SKILL.md의 "1. 스캔 대상"과 "2. OWASP Top 10 (2025) 루브릭"에서 <OWASP 코드> 행을 읽어라.
2. docs/REVIEW_RULES.md의 "리뷰 범위", "심각도 4단계", 대응 룰을 읽어라. docs/PRD.md의 "## 한계"를 읽어라(여기 적힌 것은 지적하지 않는다).
3. AGENTS.md "아키텍처 규칙", docs/ARCHITECTURE.md를 참고해 스캔 대상 파일을 탐지 신호마다 Grep으로 찾고, 걸린 곳은 파일을 열어 실제로 악용 경로가 있는지 확인하라.
4. 지적마다 JSON 객체 하나를 만든다. 공격 경로(누가, 어떤 요청으로, 무엇을 얻는지)를 댈 수 없으면 지적하지 마라.
   {"owasp": "A01", "path": "src/...", "line": <지금 파일의 줄 번호>,
    "severity": "critical|major|minor|nit", "rule": "R2" 또는 null,
    "title": "...", "evidence": "코드 인용 또는 규칙 구절", "scenario": "누가 어떻게 무엇을",
    "fix": "<붙여넣을 수 있는 코드나 SQL>"}
   비밀값 원문은 적지 말고 앞 6자 + "…"로 가려라.
5. 맡은 OWASP 코드마다 coverage 한 줄을 만든다: {"owasp": "A01", "result": "이상 없음" 또는 "N건", "checked": "무엇을 확인했는지 한 문장"}
6. 마지막 메시지는 ```json 코드 블록 하나에 {"findings": [...], "coverage": [...]}만 담아라. 다른 설명은 붙이지 마라.
```

| 묶음 | `<OWASP 코드>` |
|---|---|
| 1 | A01, A07 |
| 2 | A04, A05, A06, A08 |
| 3 | A02, A03, A09, A10 |

## 4. 취합: 거르기 → dedup → 재확인 → 재조정

1. **거르기**: 제외 경로(`tests/`, `*.test.*`, `docs/` 등)를 가리키는 지적, `docs/PRD.md` "한계"에 해당하는 지적은 버린다.
2. **dedup**: 같은 `path`에서 줄 차이가 3 이내이고 같은 문제면 하나로 합친다. 심각도는 높은 쪽, OWASP 코드는 더 직접적인 쪽, 설명은 더 구체적인 쪽을 남긴다.
3. **재확인**: 🔴🟠 지적은 해당 줄을 직접 열어 탐지 신호가 실제로 있는지 본다. 없으면 버린다. 외부 SDK 관련 지적은 `node_modules`의 타입·코드로 확인한다.
4. **재조정**: "확신이 없으면 한 단계 낮춘다", "🔴는 악용·손해를 한 문장으로 쓸 수 있을 때만"을 적용한다.
5. **가리기**: 출력 어디에도 비밀값 원문이 없게 한다.
6. **집계**: 심각도별로 센다. 판정은 critical ≥ 1이면 `Blocked`, major ≥ 1이면 `Changes Requested`, 그 외 `Approve`다.

## 5. 출력

아래 세 부분을 이 순서로 출력한다.

1. **요약**

   ````
   ## security-scan 요약 (OWASP Top 10 2025)
   판정: Changes Requested

   | 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
   |---|---|---|---|
   | 0 | 1 | 2 | 0 |

   | OWASP | 결과 | 확인한 것 |
   |---|---|---|
   | A01 Broken Access Control | 1건 | ... |
   | ... (A01~A10 열 줄 모두) |

   ### 🔴🟠 지적
   - [🟠 major] A01 · src/app/api/data/route.ts:12 제목

   GATE: critical=0 major=1 minor=2 nit=0
   ````

2. **항목별 지적**: 심각도 높은 순으로 쓴다.

   ````
   ### [🟠 major] A01 · src/app/api/data/route.ts:12 제목
   근거: <코드 인용 또는 규칙>
   악용: <누가 어떤 요청으로 무엇을 얻는지>
   → Fix:
   ```ts
   <붙여넣을 수 있는 코드>
   ```
   ````

3. **기계용 JSON**: 마지막 ```json 블록 하나에 담는다.

   ```json
   {
     "verdict": "Changes Requested",
     "counts": { "critical": 0, "major": 1, "minor": 2, "nit": 0 },
     "coverage": [{ "owasp": "A01", "result": "1건" }],
     "findings": [{ "owasp": "A01", "path": "src/app/api/data/route.ts", "line": 12, "severity": "major", "rule": null, "title": "...", "evidence": "...", "scenario": "...", "fix": "..." }]
   }
   ```

`counts`, 요약의 집계표, `GATE:` 줄의 숫자는 서로 같아야 한다.

출력 끝에 다음 한 줄을 붙인다: "수정은 사람이 건별로 승인한 뒤 적용합니다. 이 스킬은 파일을 고치지 않습니다."
