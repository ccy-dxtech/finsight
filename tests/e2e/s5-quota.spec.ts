import { expect, test } from "./support/fixtures";
import { e2eUser, resetUser } from "./support/supabase";
import { CARD_A_ROWS, statementCsv } from "./support/statement";

test.describe("S5. 이번 달 횟수를 다 쓴 무료 사용자", () => {
  test.beforeEach(async () => { await resetUser(e2eUser("a"), { plan: "free", used: 3 }); });

  test("업로드가 막히고 요금제 안내로 이어진다", async ({ page, loginAs }) => {
    await loginAs("a");
    await page.goto("/dashboard");

    await expect(page.getByRole("meter", { name: "이번 달 남은 분석 횟수" })).toHaveAttribute("aria-valuenow", "0");
    await expect(page.locator('input[type="file"]')).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "이번 달 분석 횟수를 모두 사용했어요." })).toBeVisible();
    await expect(page.getByText("테스트 결제 환경이며 실제로 청구되지 않습니다").first()).toBeVisible();

    await page.getByRole("link", { name: "요금제 살펴보기" }).first().click();
    await expect(page).toHaveURL(/\/#pricing$/);
    await expect(page.getByRole("heading", { name: "나에게 맞는 요금제" })).toBeVisible();
    await expect(page.getByRole("link", { name: "프로 구독하기" })).toHaveAttribute("href", "/api/checkout");
  });

  test("화면을 우회해 API를 직접 불러도 서버가 quota_exceeded로 막는다", async ({ page, loginAs }) => {
    await loginAs("a");
    await page.goto("/dashboard");
    const response = await page.request.post("/api/analyze", {
      multipart: { file: { name: "card.csv", mimeType: "text/csv", buffer: statementCsv(CARD_A_ROWS) } },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect((await response.json()).error).toBe("quota_exceeded");
  });
});
