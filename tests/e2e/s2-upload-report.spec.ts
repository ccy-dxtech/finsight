// 실제 Claude API를 호출한다: S2는 Haiku(열 매핑·분류) + Sonnet(리포트), S3는 Haiku(열 매핑) 1회.
import { appAlert, expect, test } from "./support/fixtures";
import { e2eUser, resetUser } from "./support/supabase";
import { CARD_A_EXPECTED, CARD_A_FILE_NAME, CARD_A_ROWS, statementCsv } from "./support/statement";

const meter = (page: import("@playwright/test").Page) =>
  page.getByRole("meter", { name: "이번 달 남은 분석 횟수" });
const stat = (page: import("@playwright/test").Page, label: string) =>
  page.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd");

test.describe("S2·S3. 명세서 업로드부터 리포트까지 (무료)", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => { await resetUser(e2eUser("a"), { plan: "free", used: 0 }); });

  test("기대값 확인: 테스트 명세서 합계가 손으로 계산한 값과 같다", () => {
    const sum = CARD_A_ROWS.reduce((total, row) => total + (row.krw ?? 0), 0);
    expect(sum).toBe(CARD_A_EXPECTED.totalAmount);
  });

  test("S2. 첫 업로드 → 분석 중 → 리포트 상세, 남은 횟수 3 → 2", async ({ page, loginAs }) => {
    test.setTimeout(300_000);
    await loginAs("a");
    await page.goto("/dashboard");
    await expect(meter(page)).toHaveAttribute("aria-valuenow", "3");
    await expect(meter(page)).toHaveAttribute("aria-valuemax", "3");
    await expect(page.getByText("아직 리포트가 없어요.")).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: CARD_A_FILE_NAME, mimeType: "text/csv", buffer: statementCsv(CARD_A_ROWS),
    });
    await expect(page.getByRole("status").getByText("분석 중이에요. 1~2분 걸릴 수 있어요")).toBeVisible();

    // 성공하면 리포트 상세로 이동하고, 실패하면 오류 안내가 뜬다. 어느 쪽인지 먼저 가린다.
    const outcome = await Promise.race([
      page.waitForURL(/\/dashboard\/reports\/[0-9a-f-]{36}$/, { timeout: 280_000 }).then(() => "report"),
      appAlert(page).waitFor({ timeout: 280_000 }).then(() => "error"),
    ]);
    if (outcome === "error") {
      throw new Error(`분석이 실패했어요: ${await appAlert(page).innerText()}`);
    }

    await expect(page.getByRole("heading", { level: 1, name: `${CARD_A_FILE_NAME} 리포트` })).toBeVisible();
    await expect(stat(page, "총지출")).toHaveText(CARD_A_EXPECTED.total);
    await expect(stat(page, "거래")).toHaveText(CARD_A_EXPECTED.count);
    await expect(stat(page, "기간")).toHaveText(CARD_A_EXPECTED.period);
    await expect(stat(page, "제외")).toHaveText(CARD_A_EXPECTED.excluded);
    await expect(page.getByRole("heading", { name: "카테고리별 지출" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "절약 제안" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "대시보드" }).getByRole("link", { name: "홈" }))
      .toHaveAttribute("aria-current", "page");

    await page.getByRole("navigation", { name: "대시보드" }).getByRole("link", { name: "홈" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(meter(page)).toHaveAttribute("aria-valuenow", "2");
    const item = page.getByRole("listitem").filter({ hasText: CARD_A_FILE_NAME });
    await expect(item).toHaveCount(1);
    await expect(item).toContainText(CARD_A_EXPECTED.total);
  });

  test("S3. 같은 파일을 다시 올리면 '이미 분석한 파일'로 안내하고 차감하지 않는다", async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await loginAs("a");
    await page.goto("/dashboard");
    await expect(meter(page)).toHaveAttribute("aria-valuenow", "2");

    await page.locator('input[type="file"]').setInputFiles({
      name: CARD_A_FILE_NAME, mimeType: "text/csv", buffer: statementCsv(CARD_A_ROWS),
    });
    const alert = appAlert(page);
    await expect(alert).toContainText("이미 분석한 파일이에요.", { timeout: 100_000 });
    await expect(alert).toContainText("횟수는 차감되지 않았어요.");

    await page.reload();
    await expect(meter(page)).toHaveAttribute("aria-valuenow", "2");
    await expect(page.getByRole("listitem").filter({ hasText: CARD_A_FILE_NAME })).toHaveCount(1);
  });
});
