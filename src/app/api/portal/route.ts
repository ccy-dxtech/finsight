import "server-only";
import { CustomerPortal } from "@polar-sh/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/api/portal");
    return NextResponse.redirect(login);
  }

  return CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    environment: "sandbox",
    returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings`,
    getExternalCustomerId: async () => user.id,
  })(request);
}
