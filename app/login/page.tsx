"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/actions/auth";

/**
 * 원본 디자인에 없던 화면이다. 로그인이 필요해서 새로 만들었고, 기존 토큰만 썼다
 * (새 색이나 크기를 만들지 않았다).
 *
 * 이메일 + 비밀번호로 로그인한다. 계정은 Supabase 대시보드에서 직접 만든다 —
 * 혼자 쓰는 서비스라 가입 화면을 두지 않았다. README.md 4단계 참고.
 *
 * 실제 로그인은 서버 액션(lib/actions/auth.ts)이 한다. 여기서 supabase-js를
 * 부르면 그 덩치가 통째로 클라이언트 번들에 들어간다.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setSigning(true);
    setError("");

    try {
      const result = await signIn(email.trim(), password);
      // 성공하면 서버 액션이 리다이렉트하므로 여기까지 오지 않는다.
      if (result?.error) {
        setSigning(false);
        setError(errorText(result.error));
      }
    } catch (e) {
      // 서버 액션의 redirect도 예외로 흐른다. 이걸 삼키면 로그인에 성공하고도
      // 화면이 그대로 멈춘다 — 다시 던져서 Next가 처리하게 둔다.
      if (isRedirect(e)) throw e;
      setSigning(false);
      setError(errorText(e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-20">
      <div className="w-full max-w-360">
        <div className="mb-24 text-center">
          <span className="text-16 font-bold tracking-logo">study·note</span>
        </div>

        <div className="rounded-card border border-line p-24">
          <h1 className="m-0 mb-7 text-15 font-semibold tracking-name">로그인</h1>
          <p className="m-0 mb-18 text-13 text-muted">이메일과 비밀번호를 넣는다.</p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mb-10 w-full rounded-input border border-field px-11 py-9 text-14 text-ink outline-none focus:border-accent"
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="mb-12 w-full rounded-input border border-field px-11 py-9 text-14 text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={signing}
              className="w-full rounded-btn bg-accent px-16 py-10 text-14 font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {signing ? "들어가는 중" : "로그인"}
            </button>
            {error && <p className="m-0 mt-10 text-13 text-rejected">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

/** 서버 액션의 redirect가 만들어내는 예외인지. digest가 NEXT_REDIRECT로 시작한다. */
function isRedirect(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "digest" in e &&
    String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

/** Supabase가 주는 영문 사유 중 자주 보는 것만 우리말로 바꾼다. 나머지는 그대로 보여준다. */
function errorText(raw: string): string {
  if (/invalid login credentials/i.test(raw)) return "이메일이나 비밀번호가 맞지 않는다.";
  if (/email not confirmed/i.test(raw)) return "이메일 확인이 끝나지 않은 계정이다.";
  if (/url and .*required/i.test(raw)) return "Supabase 접속값이 없다.";
  if (/fetch|network/i.test(raw)) return "서버에 닿지 못했다. 잠시 뒤 다시 누른다.";
  return raw;
}
