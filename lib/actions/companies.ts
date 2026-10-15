"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/** 딸린 cover_questions는 FK의 on delete cascade가 지운다. */
export async function removeCompany(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("companies").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
