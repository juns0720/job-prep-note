"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProfileLinks } from "@/lib/types";
import { requireUser } from "./util";

/** 내 링크(포트폴리오·이력서)를 저장한다. 사용자마다 한 줄이라 없으면 만들고 있으면 덮어쓴다. */
export async function saveProfileLinks(links: ProfileLinks) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("profile_links").upsert(
    {
      user_id: user.id,
      portfolio: links.portfolio,
      resume: links.resume,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
