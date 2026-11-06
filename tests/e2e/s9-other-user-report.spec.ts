import { expect, test } from "./support/fixtures";
import { e2eUser, resetUser, seedReport } from "./support/supabase";

test.describe("S9. 다른 사용자의 리포트 주소로 들어가기 (RLS)", () => {
  test("A는 B의 리포트를 볼 수 없고 404가 난다", async ({ page, loginAs }) => {
    const owner = e2eUser("b");
    await resetUser(owner);
    await resetUser(e2eUser("a"));
    const reportId = await seedReport(owner, { fileName: "e2e-b-private.csv", totalAmount: 777_000n });

    await loginAs("a");
    const response = await page.goto(`/dashboard/reports/${reportId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("e2e-b-private.csv")).toHaveCount(0);
    await expect(page.getByText("777,000")).toHaveCount(0);

    await page.goto("/dashboard");
    await expect(page.getByText("e2e-b-private.csv")).toHaveCount(0);
  });

  test("B 본인은 같은 리포트를 볼 수 있다 (시나리오 자체가 맞는지 확인)", async ({ page, loginAs }) => {
    const owner = e2eUser("b");
    await resetUser(owner);
    const reportId = await seedReport(owner, { fileName: "e2e-b-private.csv", totalAmount: 777_000n });

    await loginAs("b");
    const response = await page.goto(`/dashboard/reports/${reportId}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "e2e-b-private.csv 리포트" })).toBeVisible();
  });
});
