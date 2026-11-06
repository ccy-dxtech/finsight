import { expect, test } from "./support/fixtures";

test.describe("S1. 로그인하지 않고 보호된 화면에 들어가기", () => {
  test("랜딩의 시작하기는 로그인 화면으로 간다", async ({ page }) => {
    await page.goto("/");
    const start = page.getByRole("main").getByRole("link", { name: "시작하기" }).first();
    await expect(start).toHaveAttribute("href", "/login");
    await start.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
  });

  test("로그인하지 않고 /dashboard/trends를 열면 /login으로 보내고 원래 경로를 next에 담는다", async ({ page }) => {
    await page.goto("/dashboard/trends");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Ftrends$/);
    // 개발 서버의 "Open Next.js Dev Tools" 버튼은 main 밖에 있어 세지 않는다.
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
  });

  test("로그인한 뒤에는 next의 원래 경로로 돌아간다", async ({ page, loginAs }) => {
    await loginAs("a");
    await page.goto("/login?next=%2Fdashboard%2Ftrends");
    await expect(page).toHaveURL(/\/dashboard\/trends$/);
    await expect(page.getByRole("heading", { level: 1, name: "월별 추이" })).toBeVisible();
  });

  test("next에 외부 주소를 넣으면 /dashboard로 바꾼다", async ({ page, loginAs }) => {
    await loginAs("a");
    await page.goto("/login?next=%2F%2Fevil.example.com");
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/dashboard$/);
  });
});
