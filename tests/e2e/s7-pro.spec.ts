import { expect, test } from "./support/fixtures";
import { e2eUser, resetUser, seedTransactions, setPlan } from "./support/supabase";
import { getKstMonthStart } from "../../src/lib/plan";

function previousMonth(month: string): string {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 10);
}

test.describe("S7. 프로로 전환 (웹훅 반영을 DB로 흉내)", () => {
  const thisMonth = getKstMonthStart(new Date()); // 예: 2026-11-01
  const lastMonth = previousMonth(thisMonth); // 예: 2026-10-01

  test.beforeEach(async () => {
    const user = e2eUser("a");
    await resetUser(user, { plan: "free", used: 1 });
    // 지난달 식비 30,000 + 카페 12,000 = 42,000 / 이번 달 식비 45,000 + 교통 20,000 = 65,000
    await seedTransactions(user, [
      { occurredOn: lastMonth.replace(/01$/, "05"), merchant: "김밥천국", amount: 30_000n, category: "식비" },
      { occurredOn: lastMonth.replace(/01$/, "12"), merchant: "스타벅스", amount: 12_000n, category: "카페·간식" },
      { occurredOn: thisMonth.replace(/01$/, "02"), merchant: "김밥천국", amount: 45_000n, category: "식비" },
      { occurredOn: thisMonth.replace(/01$/, "03"), merchant: "카카오T", amount: 20_000n, category: "교통" },
    ]);
  });

  test("새로고침하면 배지·한도·월별 추이·구독 관리가 프로로 바뀐다", async ({ page, loginAs }) => {
    const user = await loginAs("a");
    await page.goto("/dashboard");
    await expect(page.getByRole("banner").getByText("무료", { exact: true })).toBeVisible();

    await setPlan(user, "pro"); // Polar subscription.active 웹훅이 하는 일
    await page.reload();

    const banner = page.getByRole("banner");
    await expect(banner.getByText("프로", { exact: true })).toBeVisible();
    await expect(banner.getByRole("link", { name: "월별 추이" })).not.toContainText("프로");
    const meter = page.getByRole("meter", { name: "이번 달 남은 분석 횟수" });
    await expect(meter).toHaveAttribute("aria-valuemax", "30");
    await expect(meter).toHaveAttribute("aria-valuenow", "29");

    await banner.getByRole("link", { name: "월별 추이" }).click();
    await expect(page.getByRole("heading", { name: "월별 총지출" })).toBeVisible();
    const months = page.getByRole("listitem");
    await expect(months.filter({ hasText: `${Number(thisMonth.slice(5, 7))}월` })).toContainText("65,000원");
    await expect(months.filter({ hasText: `${Number(lastMonth.slice(5, 7))}월` })).toContainText("42,000원");

    // 거래가 있는 가장 최근 달(이번 달)과 그 전달(지난달)을 실제 달 이름으로 비교한다.
    const label = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;
    const table = page.getByRole("table", { name: `카테고리별 ${label(lastMonth)}과 ${label(thisMonth)} 지출 비교` });
    await expect(table.getByRole("row", { name: /식비/ })).toContainText("▲ +15,000원");
    await expect(table.getByRole("row", { name: /카페·간식/ })).toContainText("▼ −12,000원");
    await expect(table.getByRole("row", { name: /교통/ })).toContainText("▲ +20,000원");

    await banner.getByRole("link", { name: "설정" }).click();
    await expect(page.getByRole("link", { name: "구독 관리" })).toHaveAttribute("href", "/api/portal");
  });

  test("subscription.revoked 뒤에는 무료로 돌아가고 데이터는 남는다", async ({ page, loginAs }) => {
    const user = await loginAs("a");
    await setPlan(user, "pro");
    await setPlan(user, "free"); // Polar subscription.revoked 웹훅이 하는 일
    await page.goto("/dashboard/trends");
    await expect(page.getByRole("heading", { name: "월별 추이는 프로에서 볼 수 있어요" })).toBeVisible();
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("link", { name: "구독 관리" })).toHaveCount(0);

    await setPlan(user, "pro");
    await page.goto("/dashboard/trends");
    await expect(page.getByRole("heading", { name: "월별 총지출" })).toBeVisible();
  });
});
