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
    // 거래와 리포트를 따로 지우므로 거래만 지워진 상태일 수 있다. 다시 시도하면 남은 것이 지워진다.
    return NextResponse.json({
      message: "**데이터를 모두 지우지 못했어요.** 일부만 지워졌을 수 있어요. 다시 시도해 주세요.",
    }, { status: 500 });
  }
}
