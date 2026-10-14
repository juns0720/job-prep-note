"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

export async function createMaterialGroup(input: { id: string; name: string; sortOrder: number }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("material_groups")
    .insert({ id: input.id, user_id: user.id, name: input.name, sort_order: input.sortOrder });
  if (error) throw error;
}

export async function renameMaterialGroup(id: string, name: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("material_groups").update({ name }).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

/** 딸린 문항은 FK의 on delete cascade가 지운다. */
export async function removeMaterialGroup(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("material_groups").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export async function createMaterial(input: { id: string; groupId: string; sortOrder: number }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("materials")
    .insert({ id: input.id, user_id: user.id, group_id: input.groupId, sort_order: input.sortOrder });
  if (error) throw error;
}

export async function removeMaterial(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("materials").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

