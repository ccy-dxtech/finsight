import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionPlan } from "@/lib/supabase/session-plan";
import { AppHeader } from "@/components/AppHeader";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSessionPlan();
  if (!session) redirect("/login");
  return <div className="min-h-screen bg-surface-soft"><AppHeader plan={session.plan} />{children}</div>;
}
