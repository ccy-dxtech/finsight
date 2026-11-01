# 실리콘밸리 엔지니어의 Claude Code — 강의 요약본

> 패스트캠퍼스 「실리콘밸리 엔지니어의 Claude Code: 바이브 코딩 & 에이전틱 워크플로우 실전 로드맵」 (강사: 하재상)
> 20+시간 · 4 Parts · 13 Chapters · 원문은 `ClaudeCode_강의_전체원문.md` 참고

## 한 줄로 보는 강의

**Vibe Coding → Agentic Engineering → Harness Engineering → 팀 확장(AX) → 24/7 자율 에이전트**
모델은 못 바꾸지만 환경(맥락·제한·흐름·검증)은 바꿀 수 있다. 도구보다 방법론이 본질이다.

## 꼭 외울 키워드 3개

| 키워드 | 한 줄 정의 | 한계 / 다음 |
| --- | --- | --- |
| **Vibe Coding** | 코드를 읽지 않고 자연어로 AI에 맡기는 것 (Karpathy, 2025.02) | 프로토타입 OK, 프로덕션 위험 |
| **Agentic Engineering** | Plan → Execute → Verify 루프 + 멀티 에이전트 | 제어 없으면 폭주 |
| **Harness Engineering** | CLAUDE.md · Rules · Hooks로 에이전트에 가드레일 | 실무 차별점이 생기는 레이어 |

---

## Part 0 · Intro

### Ch01 강사 소개 & 강의 개요
- 강사: 실리콘밸리 현직 엔지니어. 2025년 말 Claude Code 전사 도입 후 생산성 2~3배 체감.
- 도구 역할 분담: **Claude Code = 기획·리뷰**, **Codex CLI = 구현**, **Antigravity = 디자인**. 보조: Git/GitHub · VS Code · Vercel · Supabase.
- 비용(2026.4 기준): Claude Max 5x $100 권장(Pro $20 시작 가능), ChatGPT Plus $20, 나머지 무료 티어.

### Ch02 AI-Native 엔지니어로 일하기
- 하루 루프: **수집은 AI → 판단은 사람 → 실행은 다시 AI.** 브리핑도 `/briefing` 스킬로 자동.
- 생산성 5습관: ① 짧은 세션(컨텍스트 30~40% 전 `/compact`) ② CLAUDE.md 100~200줄 유지 ③ 계획 검토 4체크(범위·기존 패턴·테스트·리스크) ④ 출력 검증(테스트·diff의 삭제 코드·CI·서브에이전트 리뷰) ⑤ Memory=개인 / CLAUDE.md=팀.
- 팀 하네스 3요소: CLAUDE.md(헌법) → `.claude/rules/`(경로별 규칙) → Hooks(자동 집행). 점진 도입, 2~3명 파일럿부터.

---

## Part 1 · Foundations

### Ch01 Claude Code 딥다이브
- 핵심 제약: **컨텍스트가 찰수록 성능 저하.** 🟢 0~50% / 🟡 50~80% 정리 결정 / 🔴 80%+ 즉시 정리. 자동 압축은 안전망일 뿐.
- 권한 모드: Default · Plan · Accept Edits · Auto · Bypass → 권장 사이클 **Plan → Auto → Default**.
- 확장 7계층: CLAUDE.md · Skills(토큰 효율 최고) · MCP · Subagents · Agent Teams · Hooks · Plugins.
- 원칙: **MCP는 예외, 기본은 CLI** / "하지 마"는 요청, **Hook은 강제** / 큰 탐색은 Sub-Agent(Explore)에 격리.
- 자동화 시간축: Hook(이벤트) · `/loop`(세션 내 반복) · `/routine`(클라우드 영구).
- 가장 영향 큰 습관: **검증 수단(테스트·예상 출력)을 미리 알려주기**. 탐색→계획→구현→커밋, Writer/Reviewer 세션 분리.

### Ch02 Vibe Coding의 본질과 한계
- Karpathy 원래 정의 = "코드를 안 읽는 것", 본인도 "버릴 주말 프로젝트용"이라 함. **온램프이지 목적지 아님.**
- 잘 맞는 곳: 프로토타입 · MVP · 내부 도구 · 학습 (위험도 낮음·작은 규모·짧은 수명·소수 사용자·빠른 피드백 중 3개 이상이면 GO).
- 위험: AI 생성 앱 65% 보안 이슈(Escape.tech), AI 코드 45% 취약점(Veracode), Moltbook 사건(RLS 누락 → 토큰 150만 개 노출).
- 근본 한계: **AI 출력을 제어할 메커니즘이 없다** → Agentic(워크플로우) + Harness(영구 규칙)로 해결.

### Ch03 Agentic Engineering 개론 — 5 Pillars
| Pillar | 핵심 |
| --- | --- |
| I. Context | 다 넣지 말고 **Fresh + Condensed**. "코드베이스에 없으면 에이전트에게도 없다" |
| II. Validation | 자기 평가 불신, 외부 신호로 검증. 테스트(1차) + 로그 쿼리로 내부 상태 확인(2차) |
| III. Tooling | 사람 개입이 필요한 병목 = friction → **다리(도구)를 놓는다**. CLI 우선 |
| IV. Codebases | 같은 일을 하는 방법이 2개면 에이전트 오답률 50%. **DRY보다 일관성**, 경쟁 패턴 정리 |
| V. Compound | 스킬·MCP·규칙을 팀 Working Library로 누적 → 생산성 = 일관성 × 라이브러리 크기 |

- 실패하면 손코딩으로 돌아가지 말고, 다섯 기둥 중 어디를 보강할지 묻는다.
- 17분 실습: 지저분한 코드베이스에 CLAUDE.md·DEPRECATED 표시·스킬·자동 테스트를 깔자 같은 모델의 답이 정확해짐.

### Ch04 Harness Engineering 개론 — 6축
- 6축 순환: **구조 → 맥락 → 계획 → 실행 → 검증 → 개선**.
- 근거: 같은 작업이 하네스 차이로 $9 vs $200, LangChain 성공률 +14%p.
- 구조: `docs/`(사람 문서)와 `.dev/`(AI 흔적) 분리, 경계 3종(알려줄 것·허용할 것·막을 것).
- 계획: "해줘" 대신 "같이 계획부터", AskUserQuestion으로 되묻게.
- 실행: 혼자 / Subagent / Team(토큰 ~7배). 자율 루프(Ralph Loop)는 측정 가능한 완료 기준이 전제.
- 검증: 완료 조건 사전 합의(Sprint Contract), **만드는 AI와 검사하는 AI 분리**, 모델 교차 검증.
- 개선: **같은 작업 3번 → Skill, 같은 실수 3번 → Rule.** 좋은 하네스는 점점 단순해진다.
- 실습: harness_framework, revfactory/harness, obra/superpowers.

### Ch05 실전 바이브코딩 테크닉 — 11개 자산
CLAUDE.md · AI-Ready 코드베이스(7개 항목 100점 진단) · Second Brain(에이전트용 지식 vault) · Context Intelligence(조직 지식 레이어, 성능 15~20%↑) · Team Plugin(`/plugin install` 한 줄 배포) · TDD hook · SDD 5단계(DESIGN→PLAN→IMPLEMENT→REVIEW→REFLECT) · 토큰 대시보드 · AI 코드 리뷰(위험 점수 5축) · Guardrails(Prevent·Detect·Contain) · Oncall agent.
- 도입 순서: **CLAUDE.md → AI-Ready → Team Plugin → 나머지.**

---

## Part 2 · Hands-on Projects (FinSight 하나를 끝까지)

| 챕터 | 무엇을 | 핵심 |
| --- | --- | --- |
| **Ch01 Full-Stack SaaS** | 금융 CSV를 AI가 분석하는 FinSight (Next.js·Supabase·Polar·Vercel) | SDD 5단계. 사람이 설계 → Codex 수동 구현 1조각 → `/harness`+`execute.py`로 자동 확장 → Claude×Codex 교차 리뷰 → OAuth·결제·배포 |
| **Ch02 PR Reviewer** | 자동 PR 리뷰어 | 심각도 4단계(critical·major·minor·nit), 출력 2층(줄별 코멘트+요약), 관점별 서브에이전트 병렬, pre-commit+GitHub Action, 게이트(major↑ 사람 / minor↓ 자동 승인 / nit 자동 머지), 오탐은 룰 한 줄로 |
| **Ch03 Scalability** | 실서비스 수준 5축 | 성능(Lighthouse 측정 루프) · 보안(OWASP 전체 스캔 + DB 진단) · 데이터 안전(read-only + staging) · 관측성(PostHog) · 품질(하네스 Eval, golden set 5개로 시작) |
| **Ch04 CI/CD 에이전트** | 운영 에이전트 | CI 실패 → 수정 PR, 유저 질의 응답(근거 기반), 알림 노이즈/신호 판정 → 분석 첨부해 사람 호출. **Alert as Code**: 알림도 코드로 관리해 에이전트가 고칠 수 있게 |

- Part 2의 공통 원칙: **권한은 좁게(읽기 전용·PR만), 판단은 깊게.** 같은 하네스로 빌드·리뷰·운영.

---

## Part 3 · 팀·조직 확장 (AX = Agent Experience)

### Ch01 AX 마인드셋
- "나는 10x인데 팀은 그대로" → 원인 2가지: ① 일하는 방식이 사람 전제 ② 품질 미달(=환경 문제: 컨텍스트 부재, AI에 불친절한 코드베이스).
- **Human in the loop → on the loop**: 사람이 매 단계 대신 결과만 확인. 못 맡기는 일 = 도구/맥락 부족 신호.
- 컨텍스트 자산화(강사 팀: CLAUDE.md 49개 · 스킬 30개), A2A(스펙만 주면 에이전트들이 분담, 핵심은 완료 기준+자가 검증), 지속 개선 루프(golden set → LLM 채점 → 수정 → 회귀 없음 확인 → 사람 승인).

### Ch02 프로세스 전환 & 정착
- 바뀐 프로세스: 긴 로드맵 → **JIT 로드맵**, 작성자에게 묻기 → **Claude에게 먼저**, 전수 검수 → **Trust but verify**, 역할 경계 흐려짐.
- 정착: 처음엔 더 느려짐 → 환경 개선 + 스킬 간소화로 회복. 규범 3종(끈질긴 dogfooding · 플랫한 팀 · 죽은 프로세스 폐기).
- 숫자: 온보딩 **4주 → 1주**, AI 참여 PR **50% → 91%**, PR 산출 **+65%**.
- 커리어 5단계: assisted(1.2x) → augmented(2~3x) → orchestrated(5~10x) → autonomous(20~30x) → directed(100x). "We are all builders."

---

## Part 4 · 24/7 자율 에이전트

### Ch01 Hermes
- on the loop 다음 단계 = **always-on**: "내가 안 시켜도 일이 시작돼 있다."
- 셋업: VPS 한 대 + Discord. 하루 2회 메일·캘린더 정리, GitHub 이슈 → PR 자동 처리, 반복 작업은 스스로 스킬화.
- 정체성 3파일: **SOUL.md**(에이전트가 누구인지) · **USER.md**(나는 누구인지) · **AGENTS.md**(어떻게 일하는지).
- 깨어나는 방법: Cron(시간) · 이벤트(GitHub 이슈) · Discord(대화).
- 확장: 프로젝트별 프로필 분리 → 팀 공유 oncall agent(허용된 사용자·채널만, 토큰 상한).

---

## 실무 적용 체크리스트

- [ ] 프로젝트 루트에 CLAUDE.md 만들기 (200줄 이하, 절대 규칙을 맨 위에)
- [ ] `/statusline`으로 컨텍스트 사용량 상시 표시
- [ ] 새 작업은 Plan 모드로 시작 → 계획 4체크 → Auto 모드로 실행
- [ ] 요청할 때 검증 방법(테스트·예상 결과)을 같이 적기
- [ ] 같은 작업 3번 반복되면 Skill로, 같은 실수 3번이면 Rule로
- [ ] 반드시 지켜야 할 규칙은 Hook으로 강제 (위험 명령 차단, 자동 포맷)
- [ ] 코드 리뷰는 별도 세션/서브에이전트로 분리
- [ ] 사람 손이 반복적으로 필요한 지점을 찾아 CLI·스킬로 다리 놓기
- [ ] 팀에서 측정할 신호 3개 정하기 (예: 온보딩 시간, AI 참여 PR 비율, PR 산출량)
