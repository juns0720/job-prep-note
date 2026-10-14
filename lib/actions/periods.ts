"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/** `+ 추가`로 만든 새 시기. 이름이 이미 있으면 store 쪽에서 걸러내고 여기까지 오지 않는다. */
export async function createPeriod(name: string, sortOrder: number) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("periods").insert({ user_id: user.id, name, sort_order: sortOrder });
  if (error) throw error;
}

/** 시기 이름을 고치면 그 시기에 속한 회사의 period 문자열도 같이 바꾼다. */
export async function renamePeriod(oldName: string, newName: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { error: renameError } = await supabase
    .from("periods")
    .update({ name: newName })
    .eq("user_id", user.id)
    .eq("name", oldName);
  if (renameError) throw renameError;

  const { error: syncError } = await supabase
    .from("companies")
    .update({ period: newName })
    .eq("user_id", user.id)
    .eq("period", oldName);
  if (syncError) throw syncError;
}

export async function removePeriod(name: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("periods").delete().eq("user_id", user.id).eq("name", name);
  if (error) throw error;
}
