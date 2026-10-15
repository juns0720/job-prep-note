"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/**
 * `+ 질문 추가`로 연 빈 편집 칸은 아직 DB에 없다. 처음 쓸 때 만들어지고(createInterviewQuestion),
 * 그 뒤로 쓰는 것은 저장 큐(lib/save-queue.ts)가 보낸다. 아무것도 안 쓰고 닫으면 서버에는
 * 아무 일도 없었던 게 된다 — store.tsx의 setQDraft·leaveQuestion 참고.
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

export async function removeInterviewQuestion(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("interview_questions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
