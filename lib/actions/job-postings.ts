"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/**
 * 수집기가 넣어둔 공고를 훑어보며 바꾸는 것들이다.
 * 공고 자체(회사·제목·마감)는 수집기가 쓴 그대로 두고, 여기서는 내가 매기는
 * picked·dismissed·deleted만 고친다. 메모(note)는 타이핑마다 저장하므로 저장 큐로 보낸다
 * (lib/save-queue.ts).
 */
export async function updateJobPosting(
  id: string,
  patch: Partial<{ picked: boolean; dismissed: boolean; deleted: boolean }>,
) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("job_postings")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

/**
 * 목록에서 뺀다. 행을 실제로 지우지는 않는다.
 *
 * 지워버리면 다음에 같은 공고를 다시 수집했을 때 또 올라온다. 표시만 남겨두면
 * unique (user_id, url) 덕분에 임포터가 "이미 있는 것"으로 보고 건너뛴다.
 * 숨기기(dismissed)와 달리 화면에서 다시 꺼내 보지 않는다.
 */
export async function removeJobPosting(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase
    .from("job_postings")
    .update({ deleted: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}
