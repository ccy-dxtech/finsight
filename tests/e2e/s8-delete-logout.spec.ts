import { expect, test } from "./support/fixtures";
import { countRows, e2eUser, resetUser, seedReport, seedTransactions } from "./support/supabase";

const FILE_NAME = "e2e-seed-report.csv";

test.describe("S8. 내 데이터 전체 삭제, 그다음 로그아웃", () => {
  test.beforeEach(async () => {
    const user = e2eUser("a");
    await resetUser(user, { plan: "free", used: 1 });
    await seedReport(user, { fileName: FILE_NAME, totalAmount: 10_000n });
    await seedTransactions(user, [{ occurredOn: "2026-10-05", merchant: "김밥천국", amount: 10_000n, category: "식비" }]);
  });

  test("확인 창에서 취소하면 지우지 않고, 확인하면 거래·리포트만 지운다", async ({ page, loginAs }) => {
    const user = await loginAs("a");
    await page.goto("/dashboard");
    await expect(page.getByRole("listitem").filter({ hasText: FILE_NAME })).toHaveCount(1);
    // 대시보드 한 화면에 분석하기, 플랜(프로 구독하기), 가장 최근 리포트의 카테고리별 지출이 함께 보인다.
    await expect(page.getByRole("button", { name: "분석하기" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "프로 구독하기" })).toHaveAttribute("href", "/api/checkout");
    const bars = page.locator("section").filter({ has: page.getByRole("heading", { name: "카테고리별 지출" }) });
    await expect(bars).toContainText(FILE_NAME);
    await expect(bars).toContainText("식비");
    await expect(bars.getByRole("link", { name: "리포트 보기" })).toHaveAttribute("href", /\/dashboard\/reports\/[0-9a-f-]{36}$/);

    await page.getByRole("navigation", { name: "대시보드" }).getByRole("link", { name: "설정" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings$/);

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain("이 작업은 되돌릴 수 없어요.");
      void dialog.dismiss();
    });
    await page.getByRole("button", { name: "전체 삭제" }).click();
    await expect(page.getByRole("status").filter({ hasText: "거래와 리포트를 모두 삭제했어요." })).toHaveCount(0);
    expect(await countRows(user, "reports")).toBe(1);

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "전체 삭제" }).click();
    await expect(page.getByRole("status").filter({ hasText: "거래와 리포트를 모두 삭제했어요." })).toBeVisible();
    expect(await countRows(user, "reports")).toBe(0);
    expect(await countRows(user, "transactions")).toBe(0);

    await page.getByRole("navigation", { name: "대시보드" }).getByRole("link", { name: "홈" }).click();
    await expect(page.getByText("아직 리포트가 없어요.")).toBeVisible();
    // 이번 달 사용 횟수는 삭제해도 그대로다 (3회 중 1회 사용 → 남은 2회).
    await expect(page.getByRole("meter", { name: "이번 달 남은 분석 횟수" })).toHaveAttribute("aria-valuenow", "2");
  });

  test("로그아웃하면 랜딩으로 가고, 다시 대시보드를 열면 로그인 화면으로 간다", async ({ page, loginAs }) => {
    await loginAs("a");
    await page.goto("/");
    await expect(page.getByRole("main").getByRole("link", { name: "대시보드로 가기" })).toBeVisible();

    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
    await expect(page.getByRole("main").getByRole("link", { name: "시작하기" }).first()).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});
