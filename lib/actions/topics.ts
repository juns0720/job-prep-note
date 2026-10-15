"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/** 딸린 interview_questions는 FK의 on delete cascade가 지운다. */
export async function removeTopic(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("topics").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
