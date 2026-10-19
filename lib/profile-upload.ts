import { createClient } from "@supabase/supabase-js";
import * as profileActions from "./actions/profile";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase/env";

/**
 * 첨부 파일을 Storage에 바로 올린다. 서버 액션이 경로를 정하고 한 번 쓰는 올리기 토큰을 주면
 * (profileUploadTarget), 브라우저는 그 토큰으로 올리기만 한다. 로그인 세션 없이 토큰만 쓰므로
 * anon 키로 만든 클라이언트면 된다. 내 폴더인지는 토큰을 줄 때 서버가 이미 확인했다.
 */
export async function uploadProfileBlob(id: string, file: File): Promise<string> {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1) : "";
  const { path, token } = await profileActions.profileUploadTarget(id, ext);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await supabase.storage
    .from("profile-files")
    .uploadToSignedUrl(path, token, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  return path;
}

/** 파일 크기를 사람이 읽는 단위로. 1KB 미만은 1KB로 본다. */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}
