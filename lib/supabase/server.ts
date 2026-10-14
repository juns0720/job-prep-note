import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types";

/**
 * 서버 컴포넌트 / 서버 액션 / Route Handler에서 쓰는 Supabase 클라이언트.
 * Next.js의 cookies()를 통해 세션을 읽고 쓴다.
 *
 * 서버 컴포넌트 안에서는 쿠키를 새로 쓸 수 없어 setAll이 조용히 실패할 수 있는데,
 * 그 경우는 middleware.ts가 세션 갱신을 대신 처리하므로 무시해도 된다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // 서버 컴포넌트에서 호출되면 여기로 온다. middleware가 세션을 갱신하므로 무시한다.
        }
      },
    },
  });
}
