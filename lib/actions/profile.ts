"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./util";

/** 첨부 파일 버킷. supabase/migrations/0018_profile.sql */
const BUCKET = "profile-files";

/** 섹션을 지운다. 그 아래 항목·건은 on delete cascade로 같이 지워진다. */
export async function removeProfileSection(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("profile_sections").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export async function removeProfileField(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("profile_fields").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export async function removeProfileEntry(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { error } = await supabase.from("profile_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

/**
 * 첨부 파일을 지운다. Storage의 파일을 먼저 지우고 행을 지운다 — 반대로 하면 파일 지우기가
 * 실패했을 때 어디 있는지 알 길이 없는 파일이 남는다.
 */
export async function removeProfileFile(id: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { data: row, error: findError } = await supabase
    .from("profile_files")
    .select("path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (findError) throw findError;
  if (!row) return;
  // 내 폴더 밖의 경로는 건드리지 않는다. Storage 정책이 한 번 더 막는다.
  if (row.path.startsWith(`${user.id}/`)) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([row.path]);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from("profile_files").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

/** 첨부 파일을 잠깐(1시간) 열어 볼 수 있는 주소. 증명사진 미리보기와 내려받기에 쓴다. */
export async function signProfileFiles(paths: string[]): Promise<Record<string, string>> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const mine = paths.filter((p) => p.startsWith(`${user.id}/`));
  if (mine.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(mine, 60 * 60);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

/**
 * 파일을 올릴 주소. 파일은 서버를 거치지 않고 브라우저가 Storage로 바로 올린다 — 서버 함수는
 * 요청 본문이 몇 MB로 막혀 있어 PDF나 Word가 걸린다. 경로는 여기서 정한다(`{user_id}/{id}.{확장자}`).
 */
export async function profileUploadTarget(id: string, ext: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const path = `${user.id}/${id}${safeExt ? `.${safeExt}` : ""}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return { path, token: data.token };
}
