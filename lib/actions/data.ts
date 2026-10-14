"use server";

import { loadUserData } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/**
 * 오래 가려져 있던 화면이 다시 보일 때 데이터를 새로 읽는다. 다른 탭이나 다른 기기에서
 * 고친 내용을 옛 화면이 덮어쓰지 않게 하려는 것이다(lib/refresh.ts).
 *
 * 서버 액션은 한 줄로 서서 하나씩 나간다. 그래서 이보다 먼저 부른 추가·삭제는 다
 * 끝난 뒤에 읽는다.
 */
export async function reloadUserData() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  return loadUserData(user.id);
}
