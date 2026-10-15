"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/** 딸린 문항은 FK의 on delete cascade가 지운다. */
export async function removeMaterialGroup(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("material_groups").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export async function removeMaterial(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("materials").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

