"use server";

import { createClient } from "@/lib/supabase/server";
import type { JobRules } from "@/lib/types";
import { requireUser } from "./util";

/** 공고 필터링 규칙을 저장한다. 사용자마다 한 줄이라 없으면 만들고 있으면 덮어쓴다. */
export async function saveJobRules(rules: JobRules) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("job_rules").upsert(
    {
      user_id: user.id,
      roles: rules.roles,
      careers: rules.careers,
      stacks: rules.stacks,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
