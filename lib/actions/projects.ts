"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

export async function createProject(input: { id: string; name: string; sortOrder: number }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("projects")
    .insert({ id: input.id, user_id: user.id, name: input.name, sort_order: input.sortOrder });
  if (error) throw error;
}

export async function removeProject(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
