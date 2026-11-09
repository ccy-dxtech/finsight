// 실제 Claude API를 호출한다: PDF마다 Haiku(열 매핑·분류) + Sonnet(리포트).
// 테스트 PDF는 tests/fixtures/pdf/generate.mjs로 만든다. 거래와 기대값은 support/statement.ts에 있다.
import { fileURLToPath } from "node:url";
import { appAlert, expect, test } from "./support/fixtures";
import { e2eUser, resetUser } from "./support/supabase";
import {
  CARD_A_EXPECTED, CARD_A_PDF_FILE_NAME, CARD_B_EXPECTED, CARD_B_PDF_FILE_NAME, CARD_B_ROWS,
} from "./support/statement";

const meter = (page: import("@playwright/test").Page) =>
  page.getByRole("meter", { name: "이번 달 남은 분석 횟수" });
const stat = (page: import("@playwright/test").Page, label: string) =>
  page.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd");

test.describe("S10. PDF 명세서 업로드 (무료)", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => { await resetUser(e2eUser("a"), { plan: "free", used: 0 }); });

  test("기대값 확인: 카드 B 합계가 손으로 계산한 값과 같다", () => {
    const sum = CARD_B_ROWS.reduce((total, row) => total + (row.krw ?? 0), 0);
    expect(sum).toBe(CARD_B_EXPECTED.totalAmount);
  });

  // A: 1쪽 이용내역형. B: 2쪽 청구서형(머리말, 다른 열 순서, 할부 열, 반복 머리행, 쪽 번호, 합계 행).
  for (const { file, expected, remaining } of [
    { file: CARD_A_PDF_FILE_NAME, expected: CARD_A_EXPECTED, remaining: "2" },
    { file: CARD_B_PDF_FILE_NAME, expected: CARD_B_EXPECTED, remaining: "1" },
  ]) {
    test(`${file}를 올리면 손으로 계산한 숫자로 리포트를 만든다`, async ({ page, loginAs }) => {
      test.setTimeout(300_000);
      await loginAs("a");
      await page.goto("/dashboard");
      await page.locator('input[type="file"]').setInputFiles(fileURLToPath(new URL(`../fixtures/pdf/${file}`, import.meta.url)));
      await expect(page.getByRole("status").getByText("분석 중이에요. 1~2분 걸릴 수 있어요")).toBeVisible();

      const outcome = await Promise.race([
        page.waitForURL(/\/dashboard\/reports\/[0-9a-f-]{36}$/, { timeout: 280_000 }).then(() => "report"),
        appAlert(page).waitFor({ timeout: 280_000 }).then(() => "error"),
      ]);
      if (outcome === "error") {
        throw new Error(`분석이 실패했어요: ${await appAlert(page).innerText()}`);
      }

      await expect(page.getByRole("heading", { level: 1, name: `${file} 리포트` })).toBeVisible();
      await expect(stat(page, "총지출")).toHaveText(expected.total);
      await expect(stat(page, "거래")).toHaveText(expected.count);
      await expect(stat(page, "기간")).toHaveText(expected.period);
      await expect(stat(page, "제외")).toHaveText(expected.excluded);

      await page.getByRole("navigation", { name: "대시보드" }).getByRole("link", { name: "홈" }).click();
      await expect(meter(page)).toHaveAttribute("aria-valuenow", remaining);
      await expect(page.getByRole("listitem").filter({ hasText: file })).toContainText(expected.total);
    });
  }
});
