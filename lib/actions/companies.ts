"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/**
 * url·due·memo는 공고 목록에서 옮겨올 때만 채워진다. 화면에서 `+ 회사 추가`로
 * 만들 때는 이름과 직무만 있고 나머지는 빈 값으로 시작한다.
 */
export async function createCompany(input: {
  id: string;
  period: string;
  name: string;
  role: string;
  url?: string;
  due?: string | null;
  memo?: string;
}) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("companies").insert({
    id: input.id,
    user_id: user.id,
    period: input.period,
    name: input.name,
    role: input.role,
    url: input.url ?? "",
    due: input.due ?? null,
    memo: input.memo ?? "",
  });
  if (error) throw error;
}

/** 딸린 cover_questions는 FK의 on delete cascade가 지운다. */
export async function removeCompany(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("companies").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
