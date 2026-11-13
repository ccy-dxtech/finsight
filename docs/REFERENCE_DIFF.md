# 원본 레포와 달라진 환경

이 프로젝트는 [jha0313/finsight](https://github.com/jha0313/finsight)(2026-06에 만든 강의 실습 레포)를 따라 만든다. 그 뒤로 패키지·모델 버전이 바뀌었고, 개발 PC도 Windows다. 그래서 원본 코드나 강의 설명을 그대로 옮기면 동작하지 않는 곳이 있다. 이 문서에는 그런 곳만 모은다.

- 기능·설계를 일부러 다르게 정한 것(Haiku 열 매핑, 원본 파일 미저장, SheetJS, 디자인 시스템 등)은 이 문서가 아니라 `docs/ADR.md`에 적는다.
- 원본 방식이 여기서 안 돼서 다른 방법을 썼다면, 해당 표에 한 줄 추가한다. 이유 칸에는 확인한 근거(오류 메시지, 명령 결과)를 적는다.

## 기준 버전
| | 원본 (2026-06) | 여기 (2026-11) |
|---|---|---|
| Next.js | 15 | 16.4.5 |
| `@anthropic-ai/sdk` | 0.100 | 1.5.0 |
| `@polar-sh/nextjs` | 0.9 | 1.1.0 |
| `@supabase/ssr` | 0.10 | 0.12.7 |
| Vitest | 4 | 5.1.0 |
| ESLint | 9 | 10.14.0 |
| TypeScript | 5 | 6.0.3 |
| Claude 모델 | `claude-sonnet-4-6`, `claude-opus-4-8` | `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5` |
| 셸 | macOS·Linux 기준(`bash`, `VAR=값 명령` 형식) | Windows 11 (PowerShell + Git Bash) |

## Next.js·빌드·테스트
| 원본 | 여기서는 | 이유·근거 | 관련 파일 |
|---|---|---|---|
| `middleware.ts` | `src/proxy.ts`, 내보내는 함수 이름도 `proxy` | Next 16에서 middleware 파일 규약이 proxy로 바뀌었다. `middleware.ts`를 쓰면 빌드가 deprecated 경고를 낸다(`nextjs.org/docs/messages/middleware-to-proxy`). | `src/proxy.ts` |
| `@eslint/eslintrc`의 `FlatCompat`로 Next 규칙 불러오기 | `eslint-config-next/core-web-vitals`, `/typescript`를 flat config로 직접 import. `"lint": "eslint"` | ESLint 10, Next 16 기준. Next 16.4 CLI에는 `next lint` 명령이 없다(`next --help`). | `eslint.config.mjs`, `package.json` |
| `"dev": "NEXT_DIST_DIR=.next-dev next dev"`와 `scripts/dev-doctor.sh`(dev와 build가 같은 `.next`를 써서 화면 스타일이 깨지던 문제를 피하는 장치) | 그냥 `next dev` | Next 16은 dev 출력을 `.next/dev`로 따로 둔다. 그리고 `VAR=값 명령` 형식은 Windows에서 동작하지 않는다. 스타일 없는 화면이 다시 나오면 그때 다시 검토한다. | `package.json` |
| Vitest 4의 `esbuild` 옵션으로 JSX 설정 | `oxc: { jsx: { runtime: "automatic" } }` | Vitest 5(Vite 8)에서는 `esbuild` 옵션이 deprecated이고, 둘 다 있으면 `oxc` 설정만 쓴다. | `vitest.config.ts` |
| 없음 | `test.server.deps.inline: ["@polar-sh/nextjs"]` | `@polar-sh/nextjs` 1.1의 ESM 빌드는 `next/server`를 확장자 없이 import한다. 그런데 next 16.4의 `package.json`에는 `exports`가 없어서 Node가 그 경로를 찾지 못한다(`ERR_MODULE_NOT_FOUND ... node_modules\next\server`). 그래서 이 패키지는 Vite가 변환하도록 inline 처리한다. | `vitest.config.ts` |
| 없음 | `next dev`를 실행할 때마다 `AGENTS.md` 끝에 Next.js 안내 블록이 붙는다. 이 블록은 커밋에 넣지 않는다. | Next 16.4의 동작이다. | `docs/BROWSER_TESTING.md` "주의" |

## Claude API
| 원본 | 여기서는 | 이유·근거 | 관련 파일 |
|---|---|---|---|
| Free=`claude-sonnet-4-6`, Pro=`claude-opus-4-8` | 열 매핑·분류=`claude-haiku-5-5`, Free 리포트=`claude-sonnet-5-5`, Pro 리포트=`claude-opus-5-5`. 모델 ID는 `CLAUDE_MODEL_*` 환경 변수로 넣는다. | 5.5 세대가 나왔다. 역할별로 모델을 나눈 것은 설계 결정이다(ADR-005). | `.env.example`, `src/lib/plan.ts` |

구조화 출력 방식(`messages.parse` + `output_config.format` + `zodOutputFormat()`)은 원본과 같다. SDK 1.5에도 같은 이름으로 있고 빌드가 통과한다(`src/services/claude.ts`).

## Windows
| 원본 | 여기서는 | 이유·근거 | 관련 파일 |
|---|---|---|---|
| MCP 서버를 `"command": "npx"`로 실행 | `"command": "cmd"`, `"args": ["/c", "npx", "-y", ...]` | Claude Code가 Windows에서 `npx`를 직접 실행하지 못한다. | `.mcp.json` |
| `subprocess.run(["codex", ...])` | `shutil.which("codex")`로 찾은 전체 경로로 실행 | npm으로 설치한 `codex.cmd`는 이름만으로 실행되지 않는다. | `scripts/execute.py` |
| 프롬프트를 명령줄 인자로 넘김 | stdin으로 넘김(`codex exec ... -`) | 주입하는 문서가 약 29,000자라 Windows 명령줄 한도(32,767자)를 넘는다. | `scripts/execute.py` |
| 파일을 기본 인코딩으로 읽고 씀 | UTF-8을 명시한다. `scripts/test_execute.py`는 `PYTHONUTF8=1`로 실행한다. | Windows 기본 인코딩(cp949)으로 한국어 문서를 읽다가 멈췄다. | `scripts/execute.py`, `scripts/test_execute.py` |
| 훅 명령 `bash ...` | Codex 훅은 `commandWindows`에서 Git Bash를 전체 경로(`C:\Program Files\Git\bin\bash.exe`)로 부른다. | PATH에 `bash`가 없어서 훅이 실행되지 않았다. | `.codex/hooks.json` |
| 없음 | `.gitattributes`로 `*.sh`를 LF로 고정 | autocrlf 때문에 줄바꿈이 CRLF로 바뀌면 bash 스크립트가 깨진다. | `.gitattributes` |

## 에이전트 도구
| 원본 | 여기서는 | 이유·근거 | 관련 파일 |
|---|---|---|---|
| `browser-test` 스킬 + dev-browser + `scripts/dev-doctor.sh` | Playwright MCP(`@playwright/mcp`, 설치된 Chrome, 최대화 창) | 원본 스킬은 가져오지 않고, Claude Code에 MCP로 붙는 Playwright를 쓴다. 절차는 `docs/BROWSER_TESTING.md`에 있다. | `.mcp.json`, `docs/BROWSER_TESTING.md` |
| 강의 `/review-code` 스킬(Agent 서브에이전트 병렬, critical·major·minor·nit 4단계) | 기존 `/review` 명령이 `review-code` 워크플로(Workflow 도구)로 correctness·security·architecture(+ux) 리뷰어를 병렬로 돌린다. 심각도는 기존 P0~P2를 쓴다. PR이 있으면 인라인 코멘트, 없으면 콘솔 표로 낸다. | 차원별 반박 검증까지 정해진 순서로 돌리려고 Workflow를 쓴다. 하네스 step은 `codex exec`라 Workflow가 없으므로 에이전트 정의 파일을 직접 읽는 fallback을 둔다. 워크플로 스크립트는 단위 테스트를 둘 수 없어 TDD 가드·ESLint에서 뺐다. | `.claude/commands/review.md`, `.claude/workflows/review-code.js`, `.claude/agents/*-reviewer.md` |
