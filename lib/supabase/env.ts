/**
 * Supabase 접속값을 한 군데서 읽는다.
 *
 * `process.env.NEXT_PUBLIC_*`는 빌드할 때 문자열로 치환되므로 이 표현식을 그대로
 * 둬야 브라우저 번들에서도 값이 들어간다 — 변수에 담아 넘기면 안 된다.
 *
 * 값이 비어 있으면 createClient 계열이 "supabaseUrl is required"로 던진다.
 * 그러면 middleware가 모든 요청에서 죽어 사이트 전체가 500이 되므로,
 * 부르기 전에 configured로 먼저 걸러낸다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** 두 값이 다 있어야 Supabase를 부를 수 있다. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
