import { beforeEach, expect, it, vi } from "vitest";
import { getSessionPlan } from "./session-plan";

const { getUser, from, select, eq, maybeSingle } = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock("./server", () => ({ createServerClient: async () => ({ auth: { getUser }, from }) }));

beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "me@example.com" } }, error: null });
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ maybeSingle });
  maybeSingle.mockResolvedValue({ data: { plan: "pro" }, error: null });
});

it("세션 사용자의 profiles.plan과 로그인 이메일을 돌려준다", async () => {
  await expect(getSessionPlan()).resolves.toEqual({ userId: "user-1", email: "me@example.com", plan: "pro" });
  expect(from).toHaveBeenCalledWith("profiles");
  expect(select).toHaveBeenCalledWith("plan");
  expect(eq).toHaveBeenCalledWith("id", "user-1");
});

it("이메일이 없는 계정은 email을 null로 돌려준다", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  await expect(getSessionPlan()).resolves.toEqual({ userId: "user-1", email: null, plan: "pro" });
});

it.each([
  [{ data: { user: null }, error: null }],
  [{ data: { user: { id: "untrusted" } }, error: { message: "invalid session" } }],
])("로그인하지 않았거나 세션 오류면 null이고 프로필을 읽지 않는다: %o", async (auth) => {
  getUser.mockResolvedValue(auth);
  await expect(getSessionPlan()).resolves.toBeNull();
  expect(from).not.toHaveBeenCalled();
});

it.each([
  [{ data: null, error: { message: "db down" } }],
  [{ data: null, error: null }],
  [{ data: { plan: "enterprise" }, error: null }],
])("프로필을 읽지 못하거나 플랜 값이 이상하면 오류를 던진다: %o", async (result) => {
  maybeSingle.mockResolvedValue(result);
  await expect(getSessionPlan()).rejects.toThrow("플랜 정보를 불러오지 못했어요.");
});
