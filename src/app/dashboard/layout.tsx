import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles")
    .select("plan").eq("id", user.id).maybeSingle();
  if (error || !profile || (profile.plan !== "free" && profile.plan !== "pro")) {
    throw new Error("플랜 정보를 불러오지 못했어요.");
  }
  return <div className="min-h-screen bg-surface-soft"><AppHeader plan={profile.plan} />{children}</div>;
}
