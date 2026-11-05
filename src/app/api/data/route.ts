import "server-only";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ message: "로그인이 필요해요. 다시 로그인해 주세요." }, { status: 401 });
    }

    for (const table of ["transactions", "reports"]) {
      const { error } = await supabase.from(table).delete().eq("user_id", user.id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({
      message: "데이터를 삭제하지 못했어요. 다시 시도해 주세요. 횟수는 차감되지 않았어요.",
    }, { status: 500 });
  }
}
