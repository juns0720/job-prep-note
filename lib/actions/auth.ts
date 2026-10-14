"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 로그인을 서버에서 한다. 브라우저에서 부르면 supabase-js가 클라이언트 번들에
 * 통째로 들어가는데, 이 앱에서 브라우저가 Supabase를 직접 부르는 곳은 여기뿐이었다.
 * 성공하면 redirect로 끝나므로 반환값은 실패했을 때만 돌아온다.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
