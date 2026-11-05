import type { Plan } from "@/types";

export function getMonthlyLimit(plan: Plan): number {
  return plan === "free" ? 3 : 30;
}

export function getReportModel(plan: Plan): string {
  const name = plan === "free"
    ? "CLAUDE_MODEL_REPORT_FREE"
    : "CLAUDE_MODEL_REPORT_PRO";
  const model = process.env[name];

  if (!model) {
    throw new Error(`${name} 환경 변수가 설정되지 않았어요.`);
  }

  return model;
}

export function getFastModel(): string {
  const model = process.env.CLAUDE_MODEL_FAST;

  if (!model) {
    throw new Error("CLAUDE_MODEL_FAST 환경 변수가 설정되지 않았어요.");
  }

  return model;
}

export function getKstMonthStart(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}
