# /security-scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장소 전체를 OWASP Top 10(2025) 기준으로 훑는 `/security-scan` 스킬을 만들고, 스캔 → 수정 → 재스캔 0건까지 한 바퀴를 기록한다.

**Architecture:** `.claude/skills/security-scan/SKILL.md` 하나에 절차와 OWASP 루브릭을 함께 둔다. 실행하면 OWASP 항목을 세 묶음으로 나눈 `general-purpose` 서브에이전트 3개가 병렬로 돌고, 메인이 결과를 dedup → 재확인 → 재조정해서 `docs/REVIEW_RULES.md` 형식(심각도 4단계, `GATE:` 줄)으로 낸다. 수정은 사람이 건별로 승인한 뒤 TDD로 적용한다.

**Tech Stack:** Claude Code 스킬(Markdown), Agent 도구, Vitest, Supabase SQL 마이그레이션

**Spec:** `docs/superpowers/specs/2026-11-20-security-scan-design.md`

## Global Constraints

- 기준은 OWASP Top 10 **2025판**이다. 항목 코드는 A01~A10을 2025판 이름 그대로 쓴다.
- 심각도·판정·`GATE: critical=N major=N minor=N nit=N` 형식은 `docs/REVIEW_RULES.md`를 그대로 따른다.
- 스캔 대상: `src/`(`*.test.ts(x)` 제외), `supabase/migrations/`, `.github/`, `package.json`, `next.config.ts`, `src/proxy.ts`, `.env.example`
- 제외: `tests/`, `**/*.test.*`, `docs/`, `.claude/`, `.agents/`, `npm audit`, 원격 DB, `docs/PRD.md` "한계"(143~157행)에 적힌 항목
- `.env.local`은 읽지 않는다. 리포트에 실제 비밀값을 적지 않는다(발견해도 앞 6자 + `…`로 가린다).
- 스킬과 서브에이전트는 파일을 고치지 않는다. 보안 수정은 사람이 건별로 승인한 뒤에만 적용한다.
- 수정은 critical·major만 한다. minor·nit은 리포트에만 남긴다.
- 커밋은 conventional commits 형식으로 하고, `feat/security-scan` 브랜치에서 단계별로 한다.

## Review Focus

1. **리포트에 비밀값이 찍히는 경우**: 하드코딩된 키를 발견하면 리포트(커밋됨)에 그대로 옮겨 적힐 수 있다. 값을 가려 적어야 한다. → Task 1 루브릭 규칙, Task 2 Step 3에서 확인
2. **PRD "한계"를 다시 지적하는 경우**: 웹훅 순서·중복(153행), 동시 분석 한도 초과(150행), 상단 행 텍스트가 AI에 전달됨(155행)은 받아들인 위험이다. 지적에서 빠져야 한다. → Task 1 제외 규칙, Task 2 Step 3
3. **없는 줄이나 틀린 줄 번호를 지적하는 경우**: 서브에이전트가 줄을 지어낼 수 있다. 🔴🟠는 메인이 해당 줄을 직접 열어 확인해야 한다. → Task 1 취합 절차, Task 2 Step 3
4. **제외 경로(테스트 코드)를 지적하는 경우**: 테스트 픽스처 안의 가짜 키가 A04로 잡힐 수 있다. → Task 2 Step 3
5. **재스캔 결과가 흔들리는 경우**: 실행할 때마다 결과가 달라 새 major가 나올 수 있다. 고친 항목이 사라졌는지와 새 발견을 따로 적고, 새 critical·major는 Task 3으로 되돌린다. → Task 4 Step 2

---

### Task 1: `/security-scan` 스킬 정의

**Files:**
- Create: `.claude/skills/security-scan/SKILL.md`
- Modify: `docs/REVIEW_RULES.md:120` (S 절 첫 문단 끝에 한 문장 추가)

**Interfaces:**
- Produces: `/security-scan` 명령(인자 없음). 출력은 요약 → 항목별 지적 → 기계용 JSON 순서다. JSON 형식은 다음과 같다.
  `{ "verdict", "counts": {critical,major,minor,nit}, "coverage": [{ "owasp": "A01", "result": "이상 없음" | "N건" }], "findings": [{ "owasp", "path", "line", "severity", "rule", "title", "evidence", "scenario", "fix" }] }`
- 서브에이전트가 돌려주는 값은 ```json 블록 하나에 담긴 `{ "findings": [...], "coverage": [...] }`이다. 필드는 위와 같다.

- [ ] **Step 1: frontmatter 작성**
  - `name: security-scan`
  - `description`: 저장소 전체를 OWASP Top 10(2025)과 FinSight 룰로 스캔한다는 설명. 트리거 문구 "/security-scan", "보안 스캔", "OWASP 점검", "전체 보안 점검"을 넣는다.
  - `argument-hint` 없음

- [ ] **Step 2: 본문 절차 작성** (review-code의 1~4절 구조를 따른다)
  1. **대상**: Global Constraints의 스캔 대상과 제외 범위를 그대로 적는다.
  2. **병렬 실행**: Agent(`general-purpose`)를 한 응답에서 3번 호출한다. 공통 프롬프트 틀에 넣을 내용은 다음과 같다.
     - 맡은 OWASP 항목
     - 루브릭 읽기
     - `docs/REVIEW_RULES.md`의 "심각도 4단계"와 맡은 R룰
     - `docs/PRD.md` "한계"
     - 파일 수정 금지, `.env.local` 읽기 금지
     - 맡은 항목마다 `coverage` 1줄
     - ```json 블록 하나만 낼 것
  3. **취합**: review-code 3절과 같다(dedup → 🔴🟠 줄 직접 재확인 → 재조정 → 집계). 여기에 두 가지를 더한다. 제외 경로와 PRD "한계"에 해당하는 지적은 버린다. 비밀값은 가린다.
  4. **출력**: 요약 → 항목별 지적 → JSON 순서다.
     - **요약**: 판정, 심각도 집계표, A01~A10 coverage 표, 🔴🟠 목록, `GATE:` 줄
     - **항목별 지적** 형식:
       ```
       ### [🟠 major] A01 · path:line 제목
       근거: …
       악용: 누가 어떤 요청으로 무엇을 얻는지
       → Fix: (코드 블록)
       ```
     - 마지막에 "수정은 사람이 건별로 승인한 뒤 적용한다. 이 스킬은 고치지 않는다"를 넣는다.
  5. "diff에 들어온 줄만"이라는 REVIEW_RULES 규칙은 이 스킬에서는 "스캔 대상 전체"로 바꿔 적용한다고 명시한다. 나머지 "리뷰 범위" 규칙(SDK는 `node_modules`로 확인, 확신이 없으면 한 단계 낮춤, 🔴는 악용 시나리오를 한 문장으로 쓸 수 있을 때만)은 그대로 둔다.

- [ ] **Step 3: OWASP 루브릭 표 작성**

  열은 `코드 / 이름 / 묶음 / FinSight 탐지 신호 / 대응 룰` 다섯 개다. 묶음과 룰 대응은 아래로 확정한다. 탐지 신호 문구는 `docs/REVIEW_RULES.md` R룰·S 표와 `.claude/agents/security-reviewer.md` "확인할 것"에서 가져와 다듬는다.

  | 코드 | 묶음 | 꼭 넣을 탐지 신호 | 대응 룰 |
  |---|---|---|---|
  | A01 Broken Access Control | 1 | `create table`에 짝이 되는 RLS `enable`이 없음, `using (true)`, `profiles`·`usage`에 사용자 쓰기 정책, `security definer`에 `search_path`가 없거나 사용자 id를 인자로 받음, `grant execute ... to anon`, 요청 값으로 행을 조회(IDOR), admin 클라이언트로 사용자 데이터 조회, 오픈 리다이렉트(`safe-next` 우회), SSRF | R2, R3, S(IDOR·리다이렉트·SSRF) |
  | A02 Security Misconfiguration | 3 | `NEXT_PUBLIC_`에 비밀값, 비밀값을 읽는 모듈에 `server-only`가 없음, `next.config.ts`에 보안 헤더 없음(🟡), `.env.example`에 실제 값 | R1 |
  | A03 Software Supply Chain Failures | 3 | 의심스러운 패키지 이름, `postinstall`, 서드파티 action을 SHA가 아닌 태그로 고정, `run:`에 `${{ github.event.* }}`를 직접 삽입, 워크플로 `permissions` 과다 | S(GitHub Actions) |
  | A04 Cryptographic Failures | 2 | `sk-ant-`·`sk_`·`polar_`·JWT 하드코딩, 비밀값·토큰이 URL·쿼리스트링에, 쿠키 `secure`·`httpOnly` 누락 | S(하드코딩) |
  | A05 Injection | 2 | Supabase `.or()`·`.filter()`에 사용자 입력 이어 붙이기, SQL 동적 실행(`execute format(...)`), `dangerouslySetInnerHTML`, `eval`·`new Function`, 가맹점명 프롬프트 주입이 구조화 출력·id 참조를 우회함 | S(XSS·동적 실행) |
  | A06 Insecure Design | 2 | 원본 파일·불필요한 열 저장, 업로드·파싱에 크기·행·쪽 상한 없음 | R7, S(자원 소모) |
  | A07 Authentication Failures | 1 | 라우트·서버 코드가 `getUser()` 없이 `getSession()`만으로 판단, 사용자 id를 body·쿼리·헤더에서 받음, `auth/callback`의 `code`·`next` 처리 누락 | S(위조 가능한 값·OAuth) |
  | A08 Software or Data Integrity Failures | 2 | 웹훅 서명 검증 우회, `webhookSecret`이 빈 값일 수 있음, `product_id`를 확인하지 않고 플랜 변경, 외부 JSON을 스키마 검증 없이 사용 | R4, R9 |
  | A09 Logging & Alerting Failures | 3 | `console.*`에 토큰·거래 원문·이메일, 보안 관련 실패(웹훅·플랜 갱신)를 기록 없이 삼킴 | S(로그) |
  | A10 Mishandling of Exceptional Conditions | 3 | 오류 응답·`error.tsx`에 스택·내부 메시지, `catch` 뒤 fail-open(인증 통과·Pro 처리), 보안 경로의 Supabase 쓰기 `error` 미확인 | R10(보안 경로만) |

  묶음 1은 접근통제·인증, 묶음 2는 데이터·주입·무결성, 묶음 3은 설정·공급망·로깅·예외다.

- [ ] **Step 4: `docs/REVIEW_RULES.md` 120행 S 절 첫 문단 끝에 추가**

  `코드베이스 전체 스캔은 이 리뷰의 범위가 아니다.` 바로 뒤에 `전체 스캔은 /security-scan(OWASP Top 10 2025)이 맡는다.`를 덧붙인다.

- [ ] **Step 5: 검증**

  다음 명령을 실행한다.
  `Grep "A0[1-9]|A10" .claude/skills/security-scan/SKILL.md`

  A01~A10이 모두 보이고, 각 항목에 묶음 번호와 대응 룰이 있으면 통과다.
  새 세션이나 `/` 목록에 `security-scan`이 나타나면 통과다.

- [ ] **Step 6: 커밋**
  ```
  git add .claude/skills/security-scan/SKILL.md docs/REVIEW_RULES.md
  git commit -m "feat: OWASP Top 10 기준 전체 보안 스캔 스킬 /security-scan 추가"
  ```

### Task 2: 첫 스캔과 리포트

**Files:**
- Create: `docs/security-scans/2026-11-20-scan.md`

**Interfaces:**
- Consumes: Task 1의 `/security-scan` 출력
- Produces: 리포트 파일. 섹션은 `## 1. 첫 스캔`, `## 2. 수정`(표: 발견 / 결정(적용·보류) / 커밋), `## 3. 재스캔` 세 개다. Task 3과 Task 4는 이 파일에 덧붙인다.

- [ ] **Step 1: `/security-scan` 실행**
- [ ] **Step 2: 출력 전체를 리포트의 `## 1. 첫 스캔`에 기록**

  JSON 블록도 포함한다. `## 2. 수정`과 `## 3. 재스캔`은 제목만 둔다.

- [ ] **Step 3: 검증(실습 검증 신호)**
  - 진짜 발견이 1건 이상 있다.
  - 각 발견에 OWASP 코드, 심각도, `파일:줄`이 붙어 있다.
  - 🔴🟠는 해당 줄을 직접 열었을 때 근거가 실제로 있다.
  - 리포트에 비밀값 원문이 없다.
  - 제외 경로와 PRD "한계" 항목이 지적에 없다.

  발견이 0건이면 스킬 루브릭이 너무 좁다는 신호다. 결과를 사용자에게 보고하고 루브릭을 함께 점검한다. 억지로 발견을 만들지 않는다.

- [ ] **Step 4: 커밋**
  ```
  git add docs/security-scans/2026-11-20-scan.md
  git commit -m "docs: 첫 /security-scan 리포트 기록"
  ```

### Task 3: critical·major 수정 (발견 1건마다 반복)

**Files:** 발견에 따라 다르다. 코드는 해당 파일과 옆에 있는 `*.test.ts(x)`를 고친다. DB는 새 마이그레이션 `supabase/migrations/0002_<내용>.sql`을 만든다(`0001_init.sql`은 고치지 않는다).

- [ ] **Step 1: 수정안 제시**

  발견 하나, 고칠 diff, 추가할 테스트 이름과 assert를 사용자에게 보여 주고 승인을 기다린다. 거절하거나 보류하면 리포트의 `## 2. 수정` 표에 사유와 함께 "보류"로 적고 다음 발견으로 넘어간다.

- [ ] **Step 2: 실패하는 테스트 작성**

  공격 시나리오를 그대로 테스트로 옮긴다. 예: 세션이 없을 때 401, 다른 사용자 id면 0행, 서명이 틀리면 거부.
  마이그레이션을 고치는 경우에는 정적 테스트를 쓴다. 마이그레이션 SQL 텍스트를 읽어 해당 테이블에 `enable row level security`가 있는지 assert한다.

- [ ] **Step 3: 테스트 실행**

  `npm run test -- <테스트 파일>`을 실행해 FAIL이 나오는지 확인한다.

- [ ] **Step 4: 최소 수정 적용**
- [ ] **Step 5: 전체 확인**

  `npm run test`, `npm run lint`, `npm run build`가 모두 통과해야 한다.
  UI 파일을 고쳤다면 `docs/BROWSER_TESTING.md` 절차대로 Playwright로 데스크톱·375px 스크린샷을 찍고 콘솔 오류를 확인한다.
  마이그레이션은 원격 DB에 자동 적용하지 않는다. `docs/OPERATIONS.md`의 수동 SQL 절차를 사용자에게 안내한다.

- [ ] **Step 6: 리포트 `## 2. 수정` 표에 한 줄 추가하고 커밋**
  ```
  git add <수정 파일> <테스트 파일> docs/security-scans/2026-11-20-scan.md
  git commit -m "fix: <요약> (OWASP A0x)"
  ```

### Task 4: 재스캔과 마무리

**Files:**
- Modify: `docs/security-scans/2026-11-20-scan.md` (`## 3. 재스캔`)

- [ ] **Step 1: `/security-scan` 재실행**

  출력을 `## 3. 재스캔`에 기록한다.

- [ ] **Step 2: 검증**
  - `GATE:` 줄이 `critical=0 major=0`이다.
  - 첫 스캔의 🔴🟠 각각에 대해 "해결됨"인지 "보류(사유)"인지 대조표를 적는다.

  새 critical·major가 나왔다면 Task 3으로 돌아간다.

- [ ] **Step 3: 커밋**
  ```
  git add docs/security-scans/2026-11-20-scan.md
  git commit -m "docs: /security-scan 재스캔 0건 기록"
  ```

- [ ] **Step 4: 사용자에게 보고하고 PR 여부를 묻기**
