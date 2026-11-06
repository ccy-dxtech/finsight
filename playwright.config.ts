import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

// 테스트 계정 준비(service role)에 쓰는 값을 Next와 같은 .env.local에서 읽는다.
const envFile = fileURLToPath(new URL(".env.local", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

// OAuth 리다이렉트 기준 URL(NEXT_PUBLIC_SITE_URL)과 같은 주소에서 테스트한다.
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  // 같은 테스트 계정의 DB 상태를 바꾸므로 한 번에 하나씩 순서대로 돌린다.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // 설치된 Chrome을 쓴다(브라우저를 따로 내려받지 않음).
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
