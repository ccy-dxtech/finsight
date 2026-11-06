import { expect, test } from "./support/fixtures";
import { e2eUser, resetUser } from "./support/supabase";

test.describe("S6. 무료 사용자의 잠긴 월별 추이와 결제 성공 파라미터", () => {
  test.beforeEach(async () => { await resetUser(e2eUser("a"), { plan: "free", used: 0 }); });

  test("월별 추이는 잠금 패널과 프로 구독 버튼을 보여준다", async ({ page, loginAs }) => {
    await loginAs("a");
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "대시보드" });
    await expect(nav.getByRole("link", { name: /월별 추이/ })).toContainText("프로");

    await nav.getByRole("link", { name: /월별 추이/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/trends$/);
    await expect(page.getByRole("heading", { name: "월별 추이는 프로에서 볼 수 있어요" })).toBeVisible();
    await expect(page.getByRole("link", { name: "프로 구독하기" })).toHaveAttribute("href", "/api/checkout");
    await expect(page.getByText("테스트 결제 환경이며 실제로 청구되지 않습니다")).toBeVisible();
    await expect(page.getByRole("heading", { name: "월별 총지출" })).toHaveCount(0);
  });

  test("?checkout=success만으로는 프로가 되지 않는다 (웹훅이 바꾼 plan만 믿는다)", async ({ page, loginAs }) => {
    await loginAs("a");
    await page.goto("/dashboard?checkout=success");
    await expect(page.getByRole("status").filter({ hasText: "결제 확인 중이에요." })).toBeVisible();
    await expect(page.getByRole("banner").getByText("무료", { exact: true })).toBeVisible();
    await expect(page.getByRole("meter", { name: "이번 달 남은 분석 횟수" })).toHaveAttribute("aria-valuemax", "3");

    await page.goto("/dashboard/trends?checkout=success");
    await expect(page.getByRole("heading", { name: "월별 추이는 프로에서 볼 수 있어요" })).toBeVisible();
  });
});
