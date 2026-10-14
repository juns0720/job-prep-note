import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 로그인 안 된 상태에서 서버 액션이 불리면 여기서 막는다. RLS가 한 번 더 막아준다. */
export async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요하다.");
  return user;
}
