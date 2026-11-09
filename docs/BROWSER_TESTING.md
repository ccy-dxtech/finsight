# 브라우저 테스팅

UI를 고친 뒤 "다 됐다"고 말하기 전에, 에이전트가 실제 브라우저로 화면을 열어 스크린샷과 콘솔 오류를 직접 확인한다. 검증 신호를 모델 밖(실제 렌더링)에서 얻기 위한 절차다.

Vitest 컴포넌트 테스트는 `renderToStaticMarkup`으로 문구·aria·상태만 확인하고, 클릭·입력 같은 상호작용과 픽셀 모양은 확인하지 않는다(`docs/ARCHITECTURE.md`). 이 문서의 절차가 그 빈자리를 채운다.

## 검증 3단계
| 단계 | 도구 | 확인하는 것 | 언제 |
|---|---|---|---|
| 정적 렌더링 | Vitest (`npm run test`) | 문구, aria 속성, 상태(비활성·0회·잠금) | 매 턴 끝(Stop 훅이 lint → build → test 실행) |
| 에이전트 브라우저 확인 | Playwright MCP (`.mcp.json`) | 실제 모양(스크린샷), 콘솔 오류, 375px 폭 | UI를 고친 뒤, 완료라고 말하기 전 |
| E2E 회귀 | Playwright Test (`npm run test:e2e`) | 로그인·업로드·결제·삭제 흐름 전체 | 흐름을 바꾼 뒤, 머지 전 |

## 설정
프로젝트 루트의 `.mcp.json`에 Playwright MCP 서버(`playwright`)를 등록했다.

| 인자 | 이유 |
|---|---|
| `cmd /c npx -y` | Windows에서 Claude Code가 `npx`를 직접 실행하지 못해 `cmd /c`로 감싼다. `-y`는 설치 확인 질문으로 stdio가 멈추지 않게 한다. |
| `@playwright/mcp@0.0.84` | 버전을 고정한다. 올릴 때는 이 숫자를 직접 바꾼다. |
| `--browser chrome` | `playwright.config.ts`와 같이 설치된 Chrome을 쓴다(브라우저를 따로 내려받지 않음). |
| (`--headless` 없음) | 사람이 같이 볼 수 있게 실제 창을 띄운다. 창 없이 돌리려면 `--headless`를 넣는다. |
| `--config playwright-mcp.config.json` | 브라우저 테스팅은 항상 최대화 창으로 한다. 이 버전에는 최대화 플래그가 없어서, 설정 파일로 Chrome에 `--start-maximized`를 넘기고 `viewport: null`로 고정 뷰포트(1280×720)를 풀어 페이지가 창 크기를 따르게 한다. |
| `--isolated` | 매번 로그인 안 된 새 프로필로 시작한다. 이전 쿠키·상태가 결과에 섞이지 않는다. |
| `--output-dir test-results/browser` | 스냅샷·콘솔 로그가 쌓이는 곳. `test-results/`는 `.gitignore`에 들어 있다. |

처음 한 번:
1. Claude Code를 다시 시작하고, 프로젝트 MCP 서버 `playwright` 사용을 승인한다.
2. 새 대화를 연다. `.mcp.json`이 생기기 전에 시작한 대화에는 도구가 붙지 않는다.
3. `/mcp`에서 `playwright`가 connected인지 확인한다. 연결에 2~3초 걸리므로 그동안은 Connecting...으로 보인다. 연결 기록은 `%LOCALAPPDATA%\claude-cli-nodejs\Cache\<프로젝트>\mcp-logs-playwright\`에 남는다.

macOS·Linux에서는 `"command": "npx"`로 바꾸고 args의 `"/c"`, `"npx"`를 뺀다.

## 확인 절차
1. **서버 띄우기**: `npm run dev`를 백그라운드로 실행한다. 3000번 포트에 이미 떠 있으면 그대로 쓴다.
2. **열기**: `browser_navigate`로 `http://localhost:3000/<경로>`를 연다. 응답의 스냅샷(접근성 트리)으로 제목, 버튼 이름, 안내 문구를 확인한다.
   ```yaml
   - main:
     - button "Google 계정으로 로그인" [ref=f1e4]
   ```
3. **콘솔**: `browser_console_messages`(level `error`)로 오류가 0건인지 본다.
4. **데스크톱 스크린샷**: `browser_take_screenshot`(`fullPage: true`, `filename: test-results/browser/<화면>-desktop.png`)으로 찍고, 그 파일을 Read로 열어 아래 체크리스트대로 본다.
5. **모바일 폭**: `browser_resize`로 375×812로 바꾸고 다시 찍는다. 가로 넘침은 `browser_evaluate`로 `() => document.documentElement.scrollWidth - document.documentElement.clientWidth`가 0인지 확인한다(창 모드에서는 스크롤바 15px 때문에 `window.innerWidth`와 빼면 -15가 나온다). 끝나면 처음 열었을 때 잰 최대화 창 크기(`window.innerWidth`×`window.innerHeight`)로 되돌린다.
6. **상호작용**: 클릭·입력·업로드를 바꿨다면 `browser_click`, `browser_type`, `browser_file_upload`로 직접 해 보고 결과 화면을 다시 확인한다.
7. **닫기**: `browser_close`.
8. **보고**: 확인한 경로, 콘솔 오류 수, 스크린샷 경로, 발견한 문제를 적는다. 문제를 찾았으면 고치고 2번부터 다시 한다.

## 스크린샷 체크리스트
- 화면 문구가 한국어 해요체이고, 영어 UI 문구가 없다(`docs/UI_GUIDE.md` 한국어 우선). "테스트 결제 환경이며 실제로 청구되지 않습니다"는 정해진 고지 문장이라 예외다.
- 375px 폭에서 깨지지 않고 가로 스크롤이 없다. 표만 가로 스크롤을 허용한다.
- 제목과 본문이 단어 중간에서 줄바꿈되지 않는다(`break-keep`).
- 포인트 색은 초록 하나이고, 초록 버튼은 한 화면에 하나다.
- 좌측 정렬이 기본이다. 가운데 정렬은 로그인·분석 중·잠금 카드처럼 할 일이 하나뿐인 화면만 쓴다(`docs/UX_GUIDE.md`).
- `docs/UX_GUIDE.md`의 해당 단계 구성과 맞는다. 예: S1 로그인 = 로고 → 한 문장 → 버튼.
- 왼쪽 아래 "N" 버튼(Next.js Dev Tools)은 dev 서버에만 나오므로 무시한다.
- 창 모드에서 375px 전체 페이지 스크린샷은 푸터 아래에 흰 여백이 붙을 수 있다. 페이지 문제인지는 `document.documentElement.scrollHeight`와 푸터 아래 끝 위치가 같은지로 가린다.

## 로그인이 필요한 화면
- Playwright MCP는 `--isolated`라 항상 로그인 안 된 상태로 시작한다. Google OAuth 로그인은 자동화하지 않는다.
- E2E도 최대화 창으로 돈다(`playwright.config.ts`의 `headless: false`, `viewport: null`, `--start-maximized`). 테스트마다 새 창이 떴다 닫힌다.
- `/dashboard` 아래 화면은 해당 E2E 시나리오로 확인한다. 예: `npx playwright test tests/e2e/s6-free-locked.spec.ts`. E2E는 테스트 계정 세션 쿠키로 로그인하고, 실패하면 `test-results/`에 스크린샷과 trace를 남긴다(`npx playwright show-report`로 열기).
- E2E는 `.env.local`이 있어야 한다. service role로 테스트 계정을 만들고 끝나면 지운다. S2·S3·S4·S10은 실제 Claude API를 호출하므로 비용이 든다. 비용 없이 보호된 화면만 확인할 때는 `npx playwright test s1- s5 s6 s7 s8 s9`로 돌린다(S5는 한도 검사에서 막혀 Claude를 부르지 않는다). 인자는 파일 경로 정규식이라 `s1`이라고 쓰면 `s10`도 돈다.

## `.env.local` 없이 공개 화면만 볼 때
Supabase 클라이언트는 URL·키가 없으면 오류를 내서 랜딩부터 열리지 않는다. 랜딩(`/`)과 `/login`만 볼 때는 가짜 값으로 띄워도 된다. 세션 쿠키가 없으면 Supabase에 요청하지 않으므로 화면은 정상으로 뜬다.

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run dev
```

## 주의
- `next dev`(Next 16.4)는 실행할 때마다 `AGENTS.md` 끝에 Next.js 안내 블록을 붙인다. 브라우저 확인 뒤 `git status`에 `AGENTS.md`가 보이면 이 블록이므로, 작업 커밋에 섞지 않는다. 끄려면 `next.config.ts`에 `agentRules: false`를 둔다.

## 처음 적용 결과 (2026-11-08)
`.env.local` 없이 가짜 Supabase 값으로 띄우고, 랜딩과 `/login`을 1280px·375px에서 확인했다.

| 화면 | 렌더링 | 375px 가로 넘침 | 콘솔 오류 | 발견한 문제 |
|---|---|---|---|---|
| `/` | 정상 | 0px | 1건 | `/favicon.ico` 404. `public/`과 `src/app/icon.*`이 없다. |
| `/login` | 정상 | 0px | 0건 | 버튼 하나뿐이다. 로고와 한 문장이 없다(`docs/UX_GUIDE.md` 개선 목록 P1과 같음). |

두 문제는 아직 고치지 않았다.

`.env.local`을 넣은 뒤 Claude API를 부르지 않는 E2E(`s1 s5 s6 s7 s8 s9`)를 돌려 14개 모두 통과했다(1.2분). 로그인 리다이렉트, 한도 소진, 잠긴 월별 추이, 프로 전환·해지, 데이터 삭제·로그아웃, 다른 사용자 리포트 404(RLS)를 확인했다. Claude API를 부르는 S2·S3·S4는 돌리지 않았다.
