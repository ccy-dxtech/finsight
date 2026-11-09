---
name: e2e
description: FinSight Playwright E2E 시나리오(tests/e2e/s1~s10)를 실행 전 점검부터 결과 해석까지 수행한다. 화면 흐름·업로드·결제·삭제 동작을 바꾼 뒤 "E2E 돌려줘", "시나리오 확인", "사용자 여정 검증"을 요청받았을 때, 또는 harness step의 AC에 E2E가 있을 때 쓴다.
---

# E2E 실행

## 1. 실행 전 점검

하나라도 통과하지 못하면 실행하지 말고, 무엇이 없는지 사용자에게 알린다.

1. **`.env.local`이 지금 체크아웃 루트에 있는가**: `test -f .env.local && echo 있음`
   - worktree에는 없을 수 있다(gitignore된 파일). 저장소 루트의 `.worktreeinclude`가 새로 만드는 worktree에는 복사해 주지만, 그 전에 만든 worktree에는 없다.
   - 비밀값 파일이므로 원래 저장소에서 복사할지 사용자에게 먼저 묻는다.
2. **필요한 값이 비어 있지 않은가**: 값은 출력하지 말고 이름만 본다.
   ```bash
   grep -oE '^[A-Z_]+=.' .env.local | cut -d= -f1
   ```
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: 테스트 계정 생성·로그인 쿠키
   - `ANTHROPIC_API_KEY`: s2(업로드·리포트)
   - `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000`이어야 한다(따옴표로 감싸도 된다). 공개 값이라 `grep '^NEXT_PUBLIC_SITE_URL=' .env.local`로 직접 봐도 된다
   - `POLAR_*`는 없어도 된다. 시나리오는 결제·포털 링크의 `href`만 확인하고 누르지 않는다
3. **3000번 포트에 다른 서버가 없는가**: `playwright.config.ts`가 `reuseExistingServer: true`라서, 다른 체크아웃(예: 원래 저장소)의 `npm run dev`가 떠 있으면 그 서버를 테스트한다.
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000
   ```
   - `000`이면 비어 있다. 응답이 오면 어느 폴더의 서버인지 PowerShell로 확인한다.
     ```powershell
     $c = Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -First 1
     (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").CommandLine
     ```
     명령줄의 `node_modules` 경로가 지금 체크아웃이 아니면 사용자에게 알리고, 끌지 묻는다. 사용자가 띄운 서버이므로 묻지 않고 끄지 않는다.
4. **Chrome이 설치돼 있는가**: 브라우저를 내려받지 않고 설치된 Chrome(`channel: "chrome"`)을 쓴다.

## 2. 실행

- 시나리오 하나: `npx playwright test tests/e2e/s5-quota.spec.ts`
- 전체: `npm run test:e2e`
- `s2-upload-report.spec.ts`, `s10-pdf-upload.spec.ts`(PDF 2개)는 실제 Claude API를 호출해 비용이 든다. 업로드·분석을 바꾸지 않았으면 이 파일들은 빼고, 바뀐 동작에 해당하는 시나리오 파일만 지정해 돌린다. 파일 인자는 경로 정규식이라 `s1`은 `s10`도 잡으니 `s1-`로 쓴다.
- global-setup이 실제 Supabase 프로젝트에 `e2e-a@finsight.test`, `e2e-b@finsight.test` 계정을 지우고 새로 만든다. global-teardown이 정리한다. 시나리오는 한 번에 하나씩 순서대로 돈다(workers 1).
- dev 서버 첫 컴파일 때문에 첫 테스트가 느릴 수 있다(webServer 대기 180초).

## 3. 결과 해석과 보고

- 실패하면 실패 메시지와 `test-results/<테스트 폴더>/`의 `error-context.md`, 스크린샷(`*.png`)을 읽고 원인을 찾는다.
- 사용자에게는 `npx playwright show-report`로 HTML 리포트를, `npx playwright show-trace <trace.zip>`으로 trace를 볼 수 있다고 알린다.
- 환경 문제(값 없음, 401, 포트, 계정 생성 실패)와 실제 회귀를 나눠서 보고한다.
- 보고: 통과·실패 수, 실패한 시나리오와 원인, 실행하지 않은 시나리오와 이유.
- DB 상태를 직접 봐야 하면 Supabase MCP를 쓴다. 연결이 401로 실패하면 사용자 설정(`~/.claude.json`의 `supabase` 서버)의 토큰이 무효인 것이니 사용자에게 갱신을 요청한다.
