"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/**
 * `+ 질문 추가`로 연 빈 편집 칸은 아직 DB에 없다. 저장할 때 비로소 만들어진다
 * (createInterviewQuestion). 비운 채 취소하면 그냥 로컬 목록에서 지워지고
 * 서버에는 아무 일도 없었던 게 된다 — store.tsx의 cancelQuestion 참고.
 */
export async function createInterviewQuestion(input: {
  id: string;
  topicId: string;
  t: string;
  k: string[];
  a: string;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("interview_questions").insert({
    id: input.id,
    user_id: user.id,
    topic_id: input.topicId,
    body: input.t,
    keywords: input.k,
    answer: input.a,
    sort_order: input.sortOrder,
  });
  if (error) throw error;
}

/** 이미 있는 질문을 고쳐 저장한다. 새 질문과 달리 목록 순서는 그대로 둔다. */
export async function updateInterviewQuestion(
  id: string,
  patch: { t: string; k: string[]; a: string },
) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("interview_questions")
    .update({ body: patch.t, keywords: patch.k, answer: patch.a })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function removeInterviewQuestion(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("interview_questions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
