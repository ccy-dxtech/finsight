import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionPlan } from "@/lib/supabase/session-plan";
import { AppSidebar } from "@/components/AppSidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSessionPlan();
  if (!session) redirect("/login");
  return (
    <div className="min-h-screen bg-surface-soft lg:flex">
      <AppSidebar plan={session.plan} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
