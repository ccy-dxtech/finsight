import "server-only";
import { CustomerPortal } from "@polar-sh/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.redirect(new URL("/login", request.url));

  return CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    environment: "sandbox",
    getExternalCustomerId: async () => user.id,
  })(request);
}
