"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

export async function createCoverQuestion(input: {
  id: string;
  companyId: string;
  charLimit: number;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("cover_questions").insert({
    id: input.id,
    user_id: user.id,
    company_id: input.companyId,
    char_limit: input.charLimit,
    sort_order: input.sortOrder,
  });
  if (error) throw error;
}

/**
 * 공고에서 옮겨온 문항을 한 번에 만든다. 하나씩 넣으면 왕복이 문항 수만큼 늘고,
 * 중간에 실패하면 반만 들어간 상태가 된다.
 */
export async function createCoverQuestions(
  companyId: string,
  questions: { id: string; body: string; charLimit: number; sortOrder: number }[],
) {
  if (questions.length === 0) return;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("cover_questions").insert(
    questions.map((q) => ({
      id: q.id,
      user_id: user.id,
      company_id: companyId,
      body: q.body,
      char_limit: q.charLimit,
      sort_order: q.sortOrder,
    })),
  );
  if (error) throw error;
}

export async function removeCoverQuestion(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("cover_questions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
