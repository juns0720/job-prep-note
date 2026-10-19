/**
 * Supabase 환경 변수가 없거나 데이터 조회에 실패했을 때 설정 방법을 안내한다.
 * error가 있으면 로그인한 사용자에게 조회 오류와 확인할 설정을 보여 준다.
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
        아래 두 값을 Vercel 프로젝트의 Settings → Environment Variables에 추가한 뒤 다시 배포한다.
        내 컴퓨터에서 실행할 때는 .env.local에 넣고 개발 서버를 다시 시작한다.
      </p>

      <div className="rounded-input border border-line bg-surface p-14">
        <div className="text-125 leading-input text-body">
          NEXT_PUBLIC_SUPABASE_URL
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </div>
      </div>

      <p className="m-0 mt-18 text-12 leading-memo text-muted">
        값은 Supabase 대시보드의 Connect 또는 Project Settings → API Keys에서 확인한다.
        자세한 설정 방법은 README.md의 5단계를 참고한다.
      </p>
    </>
  );
}

function DataError({ error }: { error: string }) {
  return (
    <>
      <h1 className="m-0 mb-7 text-15 font-semibold tracking-name">데이터를 읽지 못했다</h1>
      <p className="m-0 mb-18 text-13 leading-memo text-muted">
        로그인 후 데이터를 불러오지 못했다. 처음 설치한다면 Supabase SQL Editor에서
        supabase/schema.sql을 실행했는지 확인한다. 업데이트한 뒤 발생한 오류라면
        추가로 실행할 SQL이 있는지 확인한다.
      </p>

      <div className="rounded-input border border-line bg-surface p-14">
        <div className="text-125 leading-input text-body">{error}</div>
      </div>

      <p className="m-0 mt-18 text-12 leading-memo text-muted">
        relation ... does not exist 오류는 필요한 테이블이 있는지 확인한다.
        권한 오류는 테이블 접근 권한과 RLS 정책을 확인한다.
        자세한 방법은 README.md의 3단계와 문제 해결을 참고한다.
      </p>
    </>
  );
}
