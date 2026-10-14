/**
 * 원본 디자인에 없던 화면이다. 화면을 그릴 수 없는 상태일 때 500 대신 이걸 보여준다.
 * 새 색이나 크기를 만들지 않고 로그인 화면과 같은 토큰만 썼다.
 *
 * 두 경우에 쓴다.
 * - error 없음: Supabase 접속값(환경 변수)이 비어 있다.
 * - error 있음: 접속은 되는데 데이터를 읽다가 실패했다. 대개 스키마를 아직
 *   안 올린 경우다. 사유를 그대로 보여준다 — 로그인한 사람만 보는 화면이고,
 *   여기서 감추면 배포된 곳에서 원인을 알 길이 없다.
 */
export function SetupNotice({ error }: { error?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-20">
      <div className="w-full max-w-420">
        <div className="mb-24 text-center">
          <span className="text-16 font-bold tracking-logo">study·note</span>
        </div>

        <div className="rounded-card border border-line p-24">
          {error ? <DataError error={error} /> : <MissingKeys />}
        </div>
      </div>
    </div>
  );
}

function MissingKeys() {
  return (
    <>
      <h1 className="m-0 mb-7 text-15 font-semibold tracking-name">Supabase 접속값이 없다</h1>
      <p className="m-0 mb-18 text-13 leading-memo text-muted">
        아래 두 값을 넣으면 화면이 열린다. 배포한 곳에서는 Vercel 프로젝트의
        Settings · Environment Variables에, 내 컴퓨터에서는 .env.local에 넣는다.
        값을 넣은 뒤에는 한 번 다시 배포해야 한다.
      </p>

      <div className="rounded-input border border-line bg-surface p-14">
        <div className="text-125 leading-input text-body">
          NEXT_PUBLIC_SUPABASE_URL
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </div>
      </div>

      <p className="m-0 mt-18 text-12 leading-memo text-muted">
        값은 Supabase 대시보드의 Connect 버튼이나 Project Settings · API Keys에 있다. 순서는
        README.md의 설치 가이드에 적어뒀다.
      </p>
    </>
  );
}

function DataError({ error }: { error: string }) {
  return (
    <>
      <h1 className="m-0 mb-7 text-15 font-semibold tracking-name">데이터를 읽지 못했다</h1>
      <p className="m-0 mb-18 text-13 leading-memo text-muted">
        로그인은 됐는데 테이블을 읽는 데서 막혔다. 스키마를 아직 안 올렸다면
        Supabase SQL Editor에서 supabase/schema.sql을 한 번 실행한다.
        Table Editor에 테이블 열 개가 보이면 준비된 것이다.
      </p>

      <div className="rounded-input border border-line bg-surface p-14">
        <div className="text-125 leading-input text-body">{error}</div>
      </div>

      <p className="m-0 mt-18 text-12 leading-memo text-muted">
        relation ... does not exist 면 스키마를 안 올린 것이고, 권한 이야기가 나오면
        RLS 정책이 빠진 것이다. 순서는 README.md의 3단계에 있다.
      </p>
    </>
  );
}
