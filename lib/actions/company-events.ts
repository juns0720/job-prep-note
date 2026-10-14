"use server";

import { createClient } from "@/lib/supabase/server";
import type { EventKind } from "@/lib/types";
import { requireUser } from "./util";

/** 빈 일정 줄을 만든다. 종류·날짜·메모는 그 줄에서 바로 고치고 저장 큐로 보낸다. */
export async function createCompanyEvent(input: { id: string; companyId: string; kind: EventKind }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("company_events")
    .insert({ id: input.id, user_id: user.id, company_id: input.companyId, kind: input.kind });
  if (error) throw error;
}

export async function removeCompanyEvent(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("company_events").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
