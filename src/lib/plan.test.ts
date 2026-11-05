import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFastModel,
  getKstMonthStart,
  getMonthlyLimit,
  getReportModel,
} from "./plan";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getMonthlyLimit", () => {
  it("무료는 월 3회다", () => {
    expect(getMonthlyLimit("free")).toBe(3);
  });

  it("프로는 월 30회다", () => {
    expect(getMonthlyLimit("pro")).toBe(30);
  });
});

describe("getReportModel", () => {
  it("플랜에 해당하는 환경 변수에서 모델을 읽는다", () => {
    vi.stubEnv("CLAUDE_MODEL_REPORT_FREE", "test-free-model");
    vi.stubEnv("CLAUDE_MODEL_REPORT_PRO", "test-pro-model");

    expect(getReportModel("free")).toBe("test-free-model");
    expect(getReportModel("pro")).toBe("test-pro-model");
  });

  it.each([undefined, ""])("무료 모델 설정이 %s이면 변수명을 포함한 오류를 던진다", (value) => {
    vi.stubEnv("CLAUDE_MODEL_REPORT_FREE", value);
    vi.stubEnv("CLAUDE_MODEL_REPORT_PRO", "test-pro-model");

    expect(() => getReportModel("free")).toThrow("CLAUDE_MODEL_REPORT_FREE");
  });

  it.each([undefined, ""])("프로 모델 설정이 %s이면 변수명을 포함한 오류를 던진다", (value) => {
    vi.stubEnv("CLAUDE_MODEL_REPORT_PRO", value);
    vi.stubEnv("CLAUDE_MODEL_REPORT_FREE", "test-free-model");

    expect(() => getReportModel("pro")).toThrow("CLAUDE_MODEL_REPORT_PRO");
  });
});

describe("getFastModel", () => {
  it("환경 변수에서 빠른 모델을 읽는다", () => {
    vi.stubEnv("CLAUDE_MODEL_FAST", "test-fast-model");

    expect(getFastModel()).toBe("test-fast-model");
  });

  it.each([undefined, ""])("빠른 모델 설정이 %s이면 변수명을 포함한 오류를 던진다", (value) => {
    vi.stubEnv("CLAUDE_MODEL_FAST", value);

    expect(() => getFastModel()).toThrow("CLAUDE_MODEL_FAST");
  });
});

describe("getKstMonthStart", () => {
  it.each([
    ["2026-04-30T14:59:59Z", "2026-04-01"],
    ["2026-04-30T15:00:00Z", "2026-05-01"],
    ["2026-12-31T14:59:59Z", "2026-12-01"],
    ["2026-12-31T15:00:00Z", "2027-01-01"],
    ["2026-01-01T00:00:00Z", "2026-01-01"],
  ])("%s가 속한 KST 월의 시작은 %s다", (input, expected) => {
    const now = new Date(input);

    expect(getKstMonthStart(now)).toBe(expected);
    expect(now.toISOString()).toBe(input.replace("Z", ".000Z"));
  });
});
