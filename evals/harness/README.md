# 하네스 Eval

코드에 테스트가 있듯 하네스(`/review-code`, `/security-scan`, `/harness`, `CLAUDE.md`→`AGENTS.md`, `docs/REVIEW_RULES.md`)에는 Eval이 있다.
스킬 프롬프트 한 문장, CLAUDE.md 한 줄이 에이전트 행동을 통째로 바꿀 수 있으니 **하네스를 고치면 커밋 전에 이걸 돌린다.**

```bash
python scripts/eval_harness.py                          # golden set 전부(병렬, 수 분)
python scripts/eval_harness.py --only 04-review-clean-no-fp   # 한 케이스만
python scripts/eval_harness.py --keep                   # 케이스 worktree를 남겨 디버깅
python -m unittest scripts/test_eval_harness.py         # 러너 자체 테스트
```

종료 코드: 전부 pass=0, fail 있음=1, review(사람 검토)만 있음=2. 결과는 `runs/<YYYYMMDD-HHMM>/`에 남는다.
`runs/`는 gitignore돼 있다. 기록으로 남길 실행(첫 실행, 하네스 수정 전후 비교)만 `git add -f evals/harness/runs/<ts>`로 커밋한다.
한 케이스에서 러너 오류(git 실패 등)가 나도 나머지는 계속 돌고, 그 케이스는 `review`로 보고서에 남는다.

## 동작

케이스마다:

1. `.claude/worktrees/eval-<id>`에 HEAD worktree를 만들고 `fixture` patch를 staged로 올린다.
2. **지금 작업 트리의 하네스 파일**(`CLAUDE.md`, `AGENTS.md`, `.claude/skills|commands|agents|workflows`, `docs/`)을 worktree에 덮어쓴다. 커밋하지 않은 프롬프트 수정도 그대로 평가된다.
3. pre-commit hook과 같은 형태로 `claude -p`(sonnet, hook 끔, MCP 끔)로 `prompt`를 돌린다.
4. **결정적 검사**: `gate`를 출력의 `GATE:` 줄과 비교한다(`scripts/review_gate.py`의 `parse_gate`).
5. **LLM-as-judge**: 다른 모델(opus)이 도구 없이 `expect` 루브릭만 보고 `pass`/`fail`/`unsure`를 낸다.
6. **최종 판정**

   | gate | judge | 최종 |
   |---|---|---|
   | ✓ 또는 없음 | pass | pass |
   | ✗ 또는 없음 | fail | fail |
   | ✓ | fail | review |
   | ✗ | pass | review |
   | 무엇이든 | unsure·오류 | review |

`review`는 judge도 흔들린다는 전제의 안전장치다. `runs/<ts>/<id>.out.md`를 읽고 `report.md`의 "사람 검토 필요" 체크박스에 최종 판정을 적는다.

## golden set

| id | 하네스 | 입력 | 기대 |
|---|---|---|---|
| 01-review-rls-missing | `/review-code --staged` | RLS 없는 `report_notes` 마이그레이션 | R2로 critical |
| 02-scan-service-role-public | `/security-scan` | `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | A02(R1) critical |
| 03-harness-payment-spec | `/harness` | "Polar 결제 연동" spec | 웹훅 서명 검증이 독립 step, 마지막은 phase-review |
| 04-review-clean-no-fp | `/review-code --staged` | 관례를 지킨 `formatCount` 추가 | critical·major 0 (**오탐 방지**) |
| 05-claude-md-service-role | `/review-code --staged` | `"use client"`가 admin 클라이언트 import | AGENTS.md "service_role은 서버에서만"이 발동해 critical |

## 실패 하나당 케이스 하나

운영 중 하네스가 틀린 것(놓친 버그, 오탐, 잘못 쪼갠 step)을 발견하면 버그 하나당 테스트 한 줄처럼 케이스를 하나 추가한다.

1. 문제를 재현하는 변경을 HEAD worktree에서 만들고 patch로 뽑는다. patch는 LF로 둔다(러너가 index에 먼저 적용한다).
   ```bash
   git worktree add --detach .claude/worktrees/eval-new HEAD
   # .claude/worktrees/eval-new 에서 파일 수정 후
   git -C .claude/worktrees/eval-new add -A
   git -C .claude/worktrees/eval-new diff --cached > evals/harness/fixtures/06-<이름>.patch
   git worktree remove --force .claude/worktrees/eval-new
   ```
2. `cases/06-<이름>.json`을 쓴다.
   ```json
   {
     "id": "06-<이름>",
     "title": "한 줄 설명",
     "prompt": "/review-code --staged",
     "fixture": "fixtures/06-<이름>.patch",
     "allowed_tools": ["Read", "Grep", "Glob", "Bash(git diff:*)", "Bash(git rev-parse:*)"],
     "timeout": 600,
     "gate": {"critical": ">=1"},
     "expect": "judge가 읽을 기대 동작. 무엇이 있으면 pass, 무엇이면 fail인지 구체적으로."
   }
   ```
   `gate`는 생략할 수 있다(judge만 판정). 키는 `critical`·`major`·`minor`·`nit` 또는 `critical+major`처럼 합, 값은 `">=1"`, `"0"` 같은 비교식이다.
3. 지금 하네스로 돌려 **fail이 나는지** 먼저 본다(재현). 하네스를 고친 뒤 pass가 되면 같이 커밋한다.

## 한계

- worktree에는 `node_modules`가 없어 리뷰어가 SDK 타입을 다시 확인하지 못한다.
- 작업 트리에서 지운 하네스 파일은 worktree에 HEAD 버전이 남는다(덮어쓰기만 한다).
- LLM 실행이라 결과가 흔들린다. fail이 한 번 나면 `--only`로 다시 돌려 재현되는지 본 뒤 하네스를 고친다.
- `/security-scan`(02)은 서브에이전트 3개로 저장소 전체를 봐서 가장 느리고 비싸다.
