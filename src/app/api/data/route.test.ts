import { beforeEach, expect, it, vi } from "vitest";
import { DELETE } from "./route";

const { getUser, from, remove, eq } = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), remove: vi.fn(), eq: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser }, from }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "session-user" } }, error: null });
  from.mockReturnValue({ delete: remove });
  remove.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
});

it.each([null, { message: "invalid session" }])("미인증 또는 인증 오류면 삭제 없이 401을 반환한다: %s", async (error) => {
  getUser.mockResolvedValue({ data: { user: error ? { id: "untrusted" } : null }, error });
  const response = await DELETE();
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ message: expect.stringContaining("로그인") });
  expect(from).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

it("세션 사용자의 거래와 리포트만 삭제하고 성공을 반환한다", async () => {
  const response = await DELETE();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(from.mock.calls).toEqual([["transactions"], ["reports"]]);
  expect(remove).toHaveBeenCalledTimes(2);
  expect(eq.mock.calls).toEqual([["user_id", "session-user"], ["user_id", "session-user"]]);
});

it.each(["transactions", "reports"])("%s 삭제 실패 시 한국어 오류를 반환한다", async (table) => {
  if (table === "reports") eq.mockResolvedValueOnce({ error: null });
  eq.mockResolvedValueOnce({ error: { message: "private database detail" } });
  const response = await DELETE();
  expect(response.status).toBe(500);
  const body = await response.json();
  // 거래만 지워지고 리포트 삭제가 실패할 수 있으므로 "하나도 안 지워졌다"고 말하지 않는다.
  expect(body.message).toBe("**데이터를 모두 지우지 못했어요.** 일부만 지워졌을 수 있어요. 다시 시도해 주세요.");
  expect(body.message).not.toContain("private database detail");
  expect(from.mock.calls).toEqual(table === "transactions" ? [["transactions"]] : [["transactions"], ["reports"]]);
});

it("연결 예외에도 한국어 오류 JSON을 반환한다", async () => {
  eq.mockRejectedValue(new Error("network error"));
  const response = await DELETE();
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ message: expect.stringContaining("다시 시도해 주세요") });
});
