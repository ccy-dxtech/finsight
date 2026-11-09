import { appAlert, expect, test } from "./support/fixtures";
import { e2eUser, resetUser } from "./support/supabase";
import { noColumnsCsv } from "./support/statement";

test.describe("S4. 잘못된 파일 올리기", () => {
  test.beforeEach(async () => { await resetUser(e2eUser("a"), { plan: "free", used: 0 }); });

  test("한글(hwp) 파일과 4MB 초과 파일은 서버에 보내지 않고 바로 안내한다", async ({ page, loginAs }) => {
    await loginAs("a");
    const analyzeRequests: string[] = [];
    page.on("request", (request) => { if (request.url().includes("/api/analyze")) analyzeRequests.push(request.url()); });
    await page.goto("/dashboard");
    const input = page.locator('input[type="file"]');

    await input.setInputFiles({ name: "statement.hwp", mimeType: "application/x-hwp", buffer: Buffer.from("HWP Document File") });
    await expect(appAlert(page)).toContainText("지원하지 않는 파일이에요.");

    await input.setInputFiles({ name: "big.csv", mimeType: "text/csv", buffer: Buffer.alloc(4 * 1024 * 1024 + 1, "a") });
    await expect(appAlert(page)).toContainText("파일이 4MB를 넘어요.");
    await expect(appAlert(page)).toContainText("횟수는 차감되지 않았어요.");

    expect(analyzeRequests).toEqual([]);
    await page.reload();
    await expect(page.getByRole("meter", { name: "이번 달 남은 분석 횟수" })).toHaveAttribute("aria-valuenow", "3");
  });

  // 실제 Claude API(Haiku 열 매핑) 1회를 호출한다.
  test("날짜·가맹점·금액 열이 없는 CSV는 '파일 읽기' 단계에서 안내하고 차감하지 않는다", async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await loginAs("a");
    await page.goto("/dashboard");
    await page.locator('input[type="file"]').setInputFiles({ name: "memo.csv", mimeType: "text/csv", buffer: noColumnsCsv() });

    // AI가 열을 못 찾으면 columns_not_found, 엉뚱한 열을 고르면 정규화에서 no_transactions가 된다. 둘 다 같은 단계의 실패다.
    const alert = appAlert(page);
    await expect(alert).toContainText(/날짜·가맹점·금액 열을 찾지 못했어요\.|읽을 수 있는 거래가 없어요\./, { timeout: 100_000 });
    await expect(alert).toContainText("횟수는 차감되지 않았어요.");

    await page.reload();
    await expect(page.getByRole("meter", { name: "이번 달 남은 분석 횟수" })).toHaveAttribute("aria-valuenow", "3");
    await expect(page.getByText("아직 리포트가 없어요.")).toBeVisible();
  });
});
