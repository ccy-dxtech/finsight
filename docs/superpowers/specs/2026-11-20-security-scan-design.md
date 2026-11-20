# /security-scan 설계 (Part 2 Ch03 실습 1)

## 의도
`/review-code`는 diff만 본다(`docs/REVIEW_RULES.md` S 절: "코드베이스 전체 스캔은 이 리뷰의 범위가 아니다").
나머지 절반, 저장소 전체를 OWASP Top 10 기준으로 정기적으로 훑어 누적·구조적 취약점을 잡는 스킬을 만든다.
상용 스캐너 대비 차별점은 FinSight 룰(R1~R10, S)을 그대로 기준으로 쓴다는 것.

## 목표 / 비목표
- 목표: `/security-scan` 스킬 1개, 첫 스캔 리포트(진짜 발견 ≥ 1건, OWASP 코드·심각도·`파일:줄`), critical·major 수정 후 재스캔 0건 기록
- 비목표: Codex용 사본, 원격 DB 점검(Supabase advisors), `npm audit`, hook·GitHub Action 연동, minor·nit 수정
- 반목표: 보안 수정을 사람 승인 없이 적용하는 것

## 접근 방식 (검토한 것)
| 방식 | 장단점 | 선택 |
|---|---|---|
| OWASP 묶음별 서브에이전트 3개 병렬 | review-code와 같은 패턴, 누락 적음, 토큰 3배 | ✅ |
| A01~A10 항목별 10개 | 가장 꼼꼼, 비용·dedup 부담 큼 | |
| 에이전트 1개 순차 | 가장 쌈, 뒤 항목을 대충 볼 위험 | |

## 결정 사항 (사용자)
- 기준: OWASP Top 10 **2025판**
- 루브릭 위치: `.claude/skills/security-scan/SKILL.md`에 직접. FinSight 특화 룰은 `docs/REVIEW_RULES.md`의 R 번호로 참조
- 수정 범위: critical·major만. 발견마다 수정안을 보여 주고 건별 승인 후 TDD로 적용
- 리포트: `docs/security-scans/2026-11-20-scan.md`에 첫 스캔, 재스캔은 같은 파일에 덧붙임. 커밋
- 제외: `tests/`·e2e, `docs/`·`.claude/`·`.agents/`, `npm audit`, 원격 DB, `docs/PRD.md` "한계"에 적힌 항목
- Git: `feat/security-scan` 브랜치, 스킬 → 첫 스캔 → 수정 → 재스캔 순 단계별 커밋

## 설계
- 스캔 대상: `src/`, `supabase/migrations/`, `.github/`, `package.json`, Next 설정 파일(`next.config.*`, `middleware`/`proxy`)
- 서브에이전트 묶음
  1. 접근통제·인증: A01 Broken Access Control, A07 Authentication Failures
  2. 데이터·주입·무결성: A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A08 Software or Data Integrity Failures
  3. 설정·공급망·로깅·예외: A02 Security Misconfiguration, A03 Software Supply Chain Failures, A09 Logging & Alerting Failures, A10 Mishandling of Exceptional Conditions
- 취합: dedup → 🔴🟠 해당 줄 직접 재확인 → 심각도 재조정(REVIEW_RULES "리뷰 범위") → 집계
- 출력: 요약 → 항목별(OWASP 코드·심각도·`파일:줄`·근거·수정안) → `GATE: critical=… major=… minor=… nit=…` → JSON(`owasp` 필드 포함)
- 심각도·판정·GATE 형식은 `docs/REVIEW_RULES.md` 그대로

## 내 판단 (Claude)
- 서브에이전트는 `general-purpose`. 기존 `security-reviewer`는 diff 기준·P0~P2 등급이라 맞지 않음
- `docs/REVIEW_RULES.md` S 절 "전체 스캔은 범위가 아니다" 뒤에 "전체 스캔은 `/security-scan`" 한 줄 추가

## 빌더에게 남긴 것
- OWASP 항목별 FinSight 탐지 신호의 구체 문구, R룰↔OWASP 대응표
- 리포트 파일의 세부 서식
