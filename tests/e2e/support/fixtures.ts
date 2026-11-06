import { test as base, type Locator, type Page } from "@playwright/test";
import { e2eUser, sessionCookies, type E2EUser, type UserKey } from "./supabase";

export { expect } from "@playwright/test";

// 앱의 오류 안내(Notice variant="error", role="alert").
// Next.js 라우트 안내 영역(#__next-route-announcer__)도 role="alert"라서 뺀다.
export function appAlert(page: Page): Locator {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

// loginAs("a"): 테스트마다 새 세션을 만들어 쿠키를 넣는다.
// 로그아웃이 같은 계정의 다른 세션을 끊어도 다음 테스트에 영향이 없게 하려는 것이다.
export const test = base.extend<{ loginAs: (key: UserKey) => Promise<E2EUser> }>({
  // Playwright의 fixture 인자 이름은 보통 use지만, React hooks 린트가 훅으로 오인해 provide로 부른다.
  loginAs: async ({ context, baseURL }, provide) => {
    await provide(async (key) => {
      const user = e2eUser(key);
      const cookies = await sessionCookies(user);
      await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL! })));
      return user;
    });
  },
});
