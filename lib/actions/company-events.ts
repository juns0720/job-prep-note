"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

export async function removeCompanyEvent(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("company_events").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
