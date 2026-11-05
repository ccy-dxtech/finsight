import { afterEach, expect, it, vi } from "vitest";
import { deleteMyData } from "./delete-data";

afterEach(() => vi.unstubAllGlobals());

it("내 데이터 삭제 엔드포인트에 DELETE를 보낸다", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  expect((await deleteMyData()).ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith("/api/data", { method: "DELETE" });
});
