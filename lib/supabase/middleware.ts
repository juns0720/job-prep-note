import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";
import type { Database } from "./types";

/**
 * 요청마다 세션을 갱신하고, 로그인 여부에 따라 리다이렉트한다.
 * 서버 컴포넌트는 쿠키를 새로 쓸 수 없어서(server.ts 참고) 세션 만료 직전 갱신은
 * 여기, 미들웨어에서만 확실히 일어난다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 접속값이 없으면 Supabase를 부르지 않고 그냥 보낸다. 여기서 던지면 미들웨어가
  // 모든 요청에서 죽어 사이트 전체가 500이 된다 — 안내는 app/page.tsx가 한다.
  if (!supabaseConfigured) return response;

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && !path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
