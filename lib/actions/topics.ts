"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

export async function createTopic(input: { id: string; name: string; sortOrder: number }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("topics")
    .insert({ id: input.id, user_id: user.id, name: input.name, sort_order: input.sortOrder });
  if (error) throw error;
}

export async function renameTopic(id: string, name: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("topics").update({ name }).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

/** 딸린 interview_questions는 FK의 on delete cascade가 지운다. */
export async function removeTopic(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("topics").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
