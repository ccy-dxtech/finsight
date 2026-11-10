# 서버 운영 명령어

코드 밖에서 사람이 직접 하는 서버 작업(로컬 서버, 환경 변수, Supabase, Polar, Vercel, E2E 계정)의 명령을 모은다. 코드 구조는 `docs/ARCHITECTURE.md`, 브라우저 확인 절차는 `docs/BROWSER_TESTING.md`, E2E 실행은 `.claude/skills/e2e/SKILL.md`를 본다.

- 셸은 Windows PowerShell 5.1 기준이다. `VAR=값 명령` 형식은 쓸 수 없다(`docs/REFERENCE_DIFF.md`).
- PowerShell에서 `curl`은 `Invoke-WebRequest`의 별칭이다. 이 문서의 `curl.exe`는 그대로 쳐야 한다.
- 비밀값을 화면에 출력하지 않는다. `.env.local` 내용을 통째로 보는 명령(`Get-Content .env.local`)은 화면 공유·로그에 남기지 않는다.
- 저장소 루트(`finsight/`)에서 실행한다.

## 서버 켜기·끄기

### 켜기
```powershell
npm run dev                                   # 개발 서버, http://localhost:3000
npm run build; if ($?) { npm run start }      # 프로덕션 빌드로 띄우기(배포 전 확인)
```
- 켜기 전에 아래 "기동 중인지 확인"으로 3000번이 비어 있는지 본다. 이미 쓰이고 있으면 다른 포트로 뜨거나 실패한다.
- 포트는 3000을 유지한다. Google 로그인 콜백과 결제 리다이렉트가 `NEXT_PUBLIC_SITE_URL`(`http://localhost:3000`)을 기준으로 만들어진다. 다른 포트(`npm run dev -- -p 3001`)로 띄우면 화면은 열리지만 로그인 뒤 3000번으로 돌아간다.
- `next dev`를 실행하면 `AGENTS.md` 끝에 Next.js 안내 블록이 붙는다. 이 변경은 커밋에 섞지 않는다(`docs/BROWSER_TESTING.md` "주의").

### 끄기
1. 서버를 띄운 터미널에서 `Ctrl+C`.
2. 그 터미널을 잃어버렸으면 3000번을 잡은 프로세스를 찾아 끈다.
   ```powershell
   $c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
   if ($c) { Stop-Process -Id $c.OwningProcess }
   ```
3. `프로세스를 중지할 수 없습니다. 액세스가 거부되었습니다`가 나오면 다른 Windows 계정(`docs/DEV_MEMO.md`의 메인 계정 등)이 띄운 서버다. 관리자가 아닌 계정에서는 다른 계정의 프로세스를 끌 수 없다. 어느 계정인지는 세션 번호로 찾는다.
   ```powershell
   (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").SessionId   # 세션 번호
   query user                                                                         # ID 열이 세션 번호, 그 줄이 계정 이름
   ```
   끄는 방법은 둘 중 하나다.
   - 그 계정으로 전환해 서버를 띄운 터미널(대개 VS Code 터미널)에서 `Ctrl+C`. 가장 안전하다.
   - 관리자 PowerShell(시작 메뉴에서 PowerShell 우클릭 → 관리자 권한으로 실행, 관리자 계정 암호 필요)에서 2번의 `$c = ...` 줄을 실행한 뒤 `Stop-Process -Id $c.OwningProcess -Force`. 서버 프로세스가 끝나면 부모인 `next dev`와 `npm`도 따라 끝난다.
   - `logoff <세션 번호>`는 그 계정에 열린 창을 저장하지 않고 모두 닫으므로 쓰지 않는다.
4. 아래 "기동 중인지 확인"을 실행해 `000`과 "비어 있음"이 나오는지 본다.

### 기동 중인지 확인
```powershell
# 응답 코드: 200이면 기동 중, 000이면 꺼져 있음
curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:3000

# 3000번을 잡고 있는 프로세스의 실행 명령(어느 폴더의 서버인지)
$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($c) { (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").CommandLine } else { "비어 있음" }
```
- 명령줄의 `node_modules` 경로로 어느 체크아웃(원래 저장소, worktree, 다른 PC 계정 경로)의 서버인지 가린다. E2E는 3000번에 떠 있는 서버를 그대로 재사용하므로(`reuseExistingServer: true`), 다른 폴더의 서버가 떠 있으면 그 코드를 테스트하게 된다.
- 응답은 `200`인데 명령줄이 빈 줄로 나오면 다른 Windows 계정이나 관리자 권한으로 띄운 프로세스다. 지금 계정에서는 경로를 볼 수 없다. 어느 계정인지는 위 "끄기" 3번으로 찾는다.

## 지금 상태 (2026-11-10)
| 대상 | 상태 |
|---|---|
| 로컬 dev 서버 | 동작함 |
| Supabase | 마이그레이션 적용됨(2026-11-08 E2E S1·S5~S9 통과, `docs/BROWSER_TESTING.md`). Supabase CLI는 쓰지 않는다(`supabase/config.toml` 없음) |
| Claude API | 키와 모델 ID 3개 확인됨(아래 "Claude API" 명령) |
| Polar | `.env.local`의 `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID`가 비어 있다. 결제·포털·웹훅은 아직 실제로 돌려 보지 않았다 |
| Vercel | 아직 연결하지 않았다(`.vercel/` 없음, CLI 미설치) |

## 상황별 바로가기
| 상황 | 볼 곳 |
|---|---|
| 서버를 켜거나 끄고 싶다, 3000번 포트가 이미 쓰이고 있다 | 서버 켜기·끄기 |
| 화면 스타일이 깨지거나 빌드 결과가 이상하다 | 로컬 서버 기타 > 빌드 캐시 지우기 |
| 어떤 환경 변수가 비었는지 모르겠다 | 환경 변수 |
| 새 Supabase 프로젝트를 만들었다 | Supabase > 마이그레이션 적용 |
| 결제했는데 프로로 안 바뀐다 | Polar > 웹훅 확인 → Supabase > 플랜 수동 변경 |
| 테스트 계정을 프로에서 무료로 되돌린다 | `/downgrade-free` 스킬(Polar 구독 해지 + `profiles.plan`) |
| 분석 횟수를 되돌려 줘야 한다 | Supabase > 이번 달 분석 횟수 되돌리기 |
| E2E 계정이 DB에 남아 있다 | E2E 테스트 계정 |

## 로컬 서버 기타

### 빌드 캐시 지우기
```powershell
Remove-Item -Recurse -Force .next
```
- 서버를 끈 뒤 실행한다. 다음 `npm run dev`의 첫 컴파일이 느려진다.
- 에이전트 훅(`scripts/hooks/dangerous-command-guard.sh`)이 막는 명령이라 사람이 직접 실행한다.

### `.env.local` 없이 공개 화면만 띄우기
```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"; $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy"; npm run dev
```
- 랜딩(`/`)과 `/login`만 열린다. 이 값은 그 PowerShell 창이 닫힐 때까지 남으니, 끝나면 창을 닫는다.

## 환경 변수
변수의 뜻은 `docs/ARCHITECTURE.md` "환경 변수" 표를 본다.

### 비어 있는 변수 찾기(값은 출력하지 않음)
```powershell
node -e "process.loadEnvFile('.env.local'); const names = require('fs').readFileSync('.env.example', 'utf8').match(/^[A-Z_]+(?==)/gm); for (const n of names) console.log((process.env[n] ? 'OK    ' : 'EMPTY ') + n)"
```
- `.env.example`에 있는 이름마다 `OK`(값 있음) 또는 `EMPTY`를 찍는다.
- `NEXT_PUBLIC_SITE_URL`은 로컬에서 `http://localhost:3000`이어야 한다. 공개 값이라 직접 봐도 된다: `Select-String -Path .env.local -Pattern '^NEXT_PUBLIC_SITE_URL='`

### worktree에 `.env.local` 복사
`.worktreeinclude`가 새로 만드는 worktree에는 복사해 준다. 그 전에 만든 worktree에는 직접 복사한다.
```powershell
Copy-Item ..\..\..\.env.local .env.local   # worktree 위치에 맞게 원래 저장소 경로를 고친다
```

## Supabase
Supabase CLI를 쓰지 않으므로 SQL은 Supabase 대시보드의 **SQL Editor**에서 실행한다.

- SQL Editor는 `postgres` 권한이라 **RLS를 무시한다**. `update`·`delete` 전에 같은 `where` 절로 `select`를 먼저 돌려 대상 행을 확인한다.
- 아래 SQL의 `'someone@example.com'`은 대상 사용자의 이메일로 바꾼다.
- `profiles.plan`과 `usage`는 앱에서 사용자가 바꿀 수 없다(웹훅·RPC만). 아래 수동 변경은 운영자가 잘못된 상태를 바로잡을 때만 쓴다.

### 마이그레이션 적용(새 프로젝트에서 한 번)
```powershell
Get-Content supabase/migrations/0001_init.sql -Raw -Encoding UTF8 | Set-Clipboard   # SQL을 클립보드로 복사
npx vitest run supabase/migrations/schema.test.ts                                   # SQL 정적 검사(RLS, 정책, RPC)
```
1. SQL Editor에 붙여 넣고 Run.
2. 이 파일은 다시 실행하는 용도가 아니다. 이미 적용한 프로젝트에서 돌리면 `already exists` 오류가 난다.
3. 적용 확인:
   ```sql
   -- 4개 테이블 모두 rowsecurity = true
   select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
   -- 정책 6개: profiles·usage는 select만, reports·transactions는 select·delete
   select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename, policyname;
   -- 두 함수 모두 prosecdef = true(security definer)
   select proname, prosecdef from pg_proc where proname in ('commit_analysis', 'handle_new_user');
   -- 가입 트리거 1행
   select tgname from pg_trigger where tgname = 'on_auth_user_created';
   ```

### Auth 설정(대시보드 화면, 명령 없음)
- Authentication > Providers > Google을 켜고 Google Cloud의 OAuth 클라이언트 ID·비밀값을 넣는다.
- Authentication > URL Configuration
  - Site URL: `NEXT_PUBLIC_SITE_URL`과 같은 값.
  - Redirect URLs: `http://localhost:3000/**`, 배포하면 `https://<배포 도메인>/**`도 추가. 로그인 콜백은 `/auth/callback?next=<경로>` 형식이다.

### 사용자 상태 보기
```sql
select u.id, u.email, p.plan, p.updated_at, coalesce(us.count, 0) as used_this_month
from auth.users u
left join public.profiles p on p.id = u.id
left join public.usage us on us.user_id = u.id
  and us.month = date_trunc('month', now() at time zone 'Asia/Seoul')::date
where u.email = 'someone@example.com';
```
- 이번 달은 KST 기준이다(`src/lib/plan.ts`의 `getKstMonthStart`와 같다). `plan`이 비어 있으면 아래 "profiles 행 채우기"를 한다.

### profiles 행 채우기
마이그레이션 전에 가입한 사용자는 가입 트리거가 돌지 않아 `profiles` 행이 없다. 대시보드가 플랜을 읽지 못해 오류 화면이 뜬다.
```sql
insert into public.profiles (id)
select id from auth.users
where id not in (select id from public.profiles);
```
- 새 행은 기본값 `plan = 'free'`로 들어간다.

### 이번 달 분석 횟수 되돌리기
```sql
-- 먼저 확인
select * from public.usage
where user_id = (select id from auth.users where email = 'someone@example.com')
  and month = date_trunc('month', now() at time zone 'Asia/Seoul')::date;

-- 0회로 되돌리기
delete from public.usage
where user_id = (select id from auth.users where email = 'someone@example.com')
  and month = date_trunc('month', now() at time zone 'Asia/Seoul')::date;
```
- 1회만 돌려줄 때는 `delete` 대신 `update public.usage set count = count - 1 where ...`(같은 조건, `count > 0`일 때만).

### 플랜 수동 변경
결제했는데 웹훅이 오지 않아 무료로 남았을 때만 쓴다. 먼저 Polar sandbox 대시보드에서 그 고객의 구독이 실제로 active인지 확인한다.
```sql
update public.profiles set plan = 'pro', updated_at = now()
where id = (select id from auth.users where email = 'someone@example.com');
```
- 되돌릴 때는 `plan = 'free'`. 테스트 계정이면 Polar 구독 해지까지 한 번에 하는 `/downgrade-free` 스킬(`.claude/skills/downgrade-free/`)을 쓴다.
- Polar 구독 상태와 다르게 맞추면 다음 웹훅(`subscription.revoked` 등)이 이 값을 덮어쓴다. 플랜의 출처는 웹훅이다(ADR-004).

### 사용자 데이터 지우기
```sql
-- 거래·리포트만(앱의 "내 데이터 전체 삭제"와 같음. profiles·usage는 남는다)
delete from public.transactions where user_id = (select id from auth.users where email = 'someone@example.com');
delete from public.reports      where user_id = (select id from auth.users where email = 'someone@example.com');
```
- 계정까지 지울 때는 Authentication > Users에서 사용자를 삭제한다. `on delete cascade`로 `profiles`, `reports`, `transactions`, `usage`가 함께 지워진다.

### 지표 보기
`docs/UX_GUIDE.md` "지표"의 계산을 SQL로 본다.
```sql
-- 플랜별 사용자 수
select plan, count(*) from public.profiles group by plan;

-- 첫 리포트 → 두 번째 리포트 전환(PRD 가설 1)
select count(*) filter (where n >= 1) as has_first_report,
       count(*) filter (where n >= 2) as has_second_report
from (select user_id, count(*) as n from public.reports group by user_id) t;
```

## Polar (sandbox)
`POLAR_SERVER=sandbox`만 쓴다. 실제 청구는 없다(ADR-003).

### 처음 설정(sandbox 대시보드 화면)
1. 상품: 월 구독 상품 하나(월 1,000원)를 만들고 상품 ID를 `POLAR_PRO_PRODUCT_ID`에 넣는다.
2. 토큰: Access Token을 만들어 `POLAR_ACCESS_TOKEN`에 넣는다.
3. 웹훅: 엔드포인트를 추가한다.
   - URL: `https://<배포 도메인>/api/webhooks/polar`
   - 이벤트: `subscription.active`, `subscription.revoked`. 앱은 이 둘만 플랜에 반영한다(`subscription.canceled`는 받아도 무시).
   - 서명 비밀값을 `POLAR_WEBHOOK_SECRET`에 넣는다.
4. `.env.local`(배포면 Vercel 환경 변수)을 바꿨으면 서버를 다시 띄운다.

### 로컬에서 웹훅 받기
Polar는 `localhost`로 웹훅을 보낼 수 없다. 로컬에서 결제 → 플랜 반영까지 보려면 터널이 필요하다. 이 PC에는 터널 도구가 설치돼 있지 않다.
```powershell
ngrok http 3000   # ngrok을 설치했을 때. 나온 https 주소 + /api/webhooks/polar 를 Polar 웹훅 URL로 등록
```
- 브라우저는 계속 `http://localhost:3000`으로 쓴다(로그인 콜백 기준 URL). 터널은 웹훅에만 쓴다.
- 터널 없이 프로 화면만 확인할 때는 "플랜 수동 변경" SQL을 쓴다. E2E S7도 같은 방식(service role로 `profiles.plan` 변경)이다.

### 웹훅 엔드포인트 확인
```powershell
curl.exe -i -X POST http://localhost:3000/api/webhooks/polar -H "content-type: application/json" -d "{}"
```
- `403`과 `{"received":false}`가 오면 정상이다. 서명이 없는 요청을 거부한 것이다.
- `404`면 경로나 배포가 잘못됐다. `500`이면 서버 로그(dev 서버 터미널, 배포면 `npx vercel logs`)의 오류를 본다.
- 이 응답은 비밀값이 맞는지까지는 알려주지 않는다. 비밀값이 틀리면 Polar의 실제 전송도 `403`으로 기록된다.
- 배포 뒤에는 주소를 `https://<배포 도메인>`으로 바꿔 확인한다.
- 실제 전송 결과는 Polar 대시보드의 웹훅 전송 기록(응답 코드)에서 본다.

## Claude API
### 키와 모델 ID 확인(비용 없음)
```powershell
node -e "process.loadEnvFile('.env.local'); fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } }).then(async (r) => console.log(r.status, r.ok ? (await r.json()).data.map((m) => m.id).filter((id) => [process.env.CLAUDE_MODEL_FAST, process.env.CLAUDE_MODEL_REPORT_FREE, process.env.CLAUDE_MODEL_REPORT_PRO].includes(id)).join(', ') : ''))"
```
- `200 claude-haiku-5-5, claude-sonnet-5-5, claude-opus-5-5`처럼 상태 코드와 `.env.local`에 넣은 모델 ID 3개가 나오면 정상이다.
- `401`이면 키가 틀렸다. ID가 3개보다 적게 나오면 `CLAUDE_MODEL_*` 값에 오타가 있다.
- 모델 목록 조회라 토큰 비용이 들지 않는다. 실제 분석(E2E S2·S3·S4·S10)은 비용이 든다.

## Vercel 배포
아직 연결하지 않았다. 아래는 처음 배포할 때의 순서이고, 이 저장소에서 실행해 본 적은 없다.
```powershell
npx vercel login
npx vercel link                                     # 프로젝트 연결, .vercel/ 생성
npx vercel env add ANTHROPIC_API_KEY production     # 변수마다 반복, 값은 프롬프트에 붙여 넣는다
npx vercel env ls                                   # 등록한 변수 이름 확인
npx vercel --prod                                   # 프로덕션 배포
npx vercel logs <배포 URL>                          # 런타임 로그(웹훅·분석 오류 확인)
```
- 넣을 변수는 `.env.example`의 이름 전부다. `NEXT_PUBLIC_SITE_URL`은 배포 도메인(`https://...`)으로 넣는다. `NEXT_PUBLIC_` 값은 빌드할 때 코드에 박히므로, 바꾸면 다시 배포한다.
- 배포 뒤 함께 바꿀 곳
  - Supabase Redirect URLs에 `https://<배포 도메인>/**` 추가.
  - Polar 웹훅 URL을 배포 도메인으로 등록.
  - `/api/analyze`의 `maxDuration = 300`이 Vercel 플랜 한도 안인지 확인(ADR-008).

## E2E 테스트 계정
E2E는 실제 Supabase 프로젝트에 `e2e-a@finsight.test`, `e2e-b@finsight.test`를 만들고, 끝나면 지운다. 다음 실행의 global-setup도 남은 계정을 지우고 새로 만든다.

### 남은 계정 확인과 삭제
테스트가 중간에 멈췄거나 계정을 남겨 둔 뒤 정리할 때 쓴다.
```sql
select id, email, created_at from auth.users where email like 'e2e-%@finsight.test';

delete from auth.users where email in ('e2e-a@finsight.test', 'e2e-b@finsight.test');
```
- `on delete cascade`로 그 계정의 프로필·리포트·거래·사용량이 함께 지워진다.

### 디버깅용으로 계정 남기기
```powershell
$env:E2E_KEEP_USERS = "1"; npx playwright test tests/e2e/s5-quota.spec.ts; Remove-Item Env:E2E_KEEP_USERS
```
- 끝난 뒤 위 "사용자 상태 보기" SQL에 `e2e-a@finsight.test`를 넣어 DB 상태를 본다.
- 실패 기록은 `npx playwright show-report`로 연다.
