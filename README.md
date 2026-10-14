# job-prep-note

취업 준비를 한곳에 기록하는 개인용 웹앱입니다. 자기소개서, 면접 답변, 채용 공고, 전형 일정을
한 화면에서 관리합니다. 내 Supabase(DB)와 Vercel(호스팅)에 올려서 나만 로그인해 쓰는 구조라,
쓰는 데 돈이 들지 않고(둘 다 무료 플랜) 데이터도 내 계정에만 남습니다.

| 탭 | 하는 일 |
|---|---|
| **자기소개서** | 지원 시기(예: 2026 하반기)별로 회사를 모으고, 회사마다 자소서 문항과 답변을 씁니다. 글자 수 게이지, 마감 D-day, 진행 상태(작성 중·지원 완료·서류 합격·면접 …), 전형 일정을 적습니다. 회사별로 `.md` 파일로 내려받을 수 있습니다 |
| **재료** | 자소서에 쓸 경험과 문항을 컨셉(갈등 상황, 기술 답변 …)별로 모아 둡니다. 실제로 쓸 것만 "최종"으로 골라 둘 수 있습니다 |
| **프로젝트** | 해온 프로젝트를 이름·설명·키워드로 적어 둡니다 |
| **면접 준비** | 주제별로 예상 질문, 키워드, 답변을 정리합니다 |
| **공고** | 공고 수집기(사람인·자소설닷컴·인디스워크)가 모아 온 공고를 훑어보고, 마음에 드는 공고를 자기소개서로 옮깁니다. 직무·경력·스택 칩으로 필터링 규칙을 고르면 수집기가 그대로 거릅니다 |
| **캘린더** | 마감일과 전형 일정을 한 달 달력으로 봅니다 |

**스택** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth) · Vercel

---

## 목차

설치는 1단계부터 순서대로 따라 하면 됩니다. 처음이면 30분쯤 걸립니다.

0. [준비물](#0-준비물)
1. [내 레포 만들고 내려받기](#1-내-레포-만들고-내려받기)
2. [Supabase 프로젝트 만들기](#2-supabase-프로젝트-만들기)
3. [테이블 만들기](#3-테이블-만들기)
4. [로그인 계정 만들기](#4-로그인-계정-만들기)
5. [`.env.local` 채우기](#5-envlocal-채우기)
6. [내 컴퓨터에서 실행하기](#6-내-컴퓨터에서-실행하기)
7. [Vercel에 배포하기](#7-vercel에-배포하기)
8. [공고 수집하기 (선택)](#8-공고-수집하기-선택)
9. [AI와 자소서 쓰기 (선택)](#9-ai와-자소서-쓰기-선택)
- [막혔을 때](#막혔을-때)
- [고쳐 쓰기](#고쳐-쓰기)

---

## 0. 준비물

| 무엇 | 왜 | 확인 |
|---|---|---|
| [Node.js](https://nodejs.org) 20 이상 (LTS 추천) | 앱과 수집 스크립트를 돌린다 | 터미널에서 `node -v` |
| [Git](https://git-scm.com) | 레포를 내려받는다 | `git --version` |
| [GitHub](https://github.com) 계정 | 템플릿으로 내 레포를 만든다 | |
| [Supabase](https://supabase.com) 계정 (무료) | DB와 로그인 | GitHub 계정으로 가입하면 편하다 |
| [Vercel](https://vercel.com) 계정 (무료) | 인터넷에 올린다. 내 컴퓨터에서만 쓸 거면 없어도 된다 | GitHub 계정으로 가입하면 편하다 |

명령은 전부 터미널(macOS는 터미널 앱, Windows는 PowerShell)에서 칩니다.

## 1. 내 레포 만들고 내려받기

1. 이 레포 GitHub 페이지 오른쪽 위의 **Use this template → Create a new repository**를 누릅니다.
2. 레포 이름을 정하고 만듭니다. 공개(Public)든 비공개(Private)든 상관없습니다 — 자소서 같은
   내 데이터는 레포가 아니라 Supabase에 저장됩니다.
3. 만든 레포를 내려받고 패키지를 설치합니다.

```bash
git clone https://github.com/<내 아이디>/<레포 이름>.git
cd <레포 이름>
npm install
```

## 2. Supabase 프로젝트 만들기

1. [supabase.com/dashboard](https://supabase.com/dashboard)에 로그인하고 **New project**를 누릅니다.
2. 이렇게 채웁니다.
   - **Name**: 아무거나 (`job-prep-note` 추천)
   - **Database Password**: **Generate a password**를 눌러 만들고 어딘가에 적어 둡니다
     (이 앱은 쓰지 않지만 나중에 DB에 직접 붙을 때 필요합니다).
   - **Region**: 한국에서 쓴다면 **Northeast Asia (Seoul)**
   - **Security** 항목의 **Enable Data API**는 **켜 둡니다**(기본값). 끄면 앱이 DB를 읽지 못합니다.
     나머지 체크박스는 기본값 그대로 둬도 됩니다.
3. **Create new project**를 누르고 1~2분 기다립니다.

무료 플랜은 프로젝트를 두 개까지 만들 수 있습니다. 이미 두 개가 있으면 하나를 일시 정지하거나 지워야 합니다.

## 3. 테이블 만들기

테이블 열한 개와 보안 정책(RLS)을 SQL 한 번으로 만듭니다.

1. 레포의 [`supabase/schema.sql`](supabase/schema.sql) 파일을 열어 내용을 **전부** 복사합니다.
2. Supabase 왼쪽 메뉴의 **SQL Editor**로 들어갑니다.
3. 빈 쿼리 창에 붙여 넣고 오른쪽 아래 **Run**을 누릅니다.
   `Success. No rows returned`가 나오면 성공입니다.
4. 왼쪽 메뉴 **Table Editor**에 아래 열한 개가 보이는지 확인합니다.

| 테이블 | 담는 것 |
|---|---|
| `periods` | 지원 시기 (예: 2026 하반기) |
| `companies` | 지원한 회사 — 직무, 마감일, 진행 상태, 메모 |
| `cover_questions` | 회사별 자소서 문항과 답변 |
| `company_events` | 회사별 전형 일정 (코딩테스트, 면접 …) |
| `material_groups` | 재료 컨셉 |
| `materials` | 재료 문항 |
| `projects` | 프로젝트 |
| `topics` | 면접 주제 |
| `interview_questions` | 면접 질문·키워드·답변 |
| `job_postings` | 수집한 채용 공고 |
| `job_rules` | 공고 필터링 규칙 (직무·경력·스택) |

모든 테이블에 RLS(Row Level Security)가 켜져 있어서, 로그인한 사람은 **자기 행만** 읽고 쓸 수 있습니다.
로그인하지 않은 요청은 어떤 테이블에도 접근하지 못합니다.

> `schema.sql`은 새 프로젝트에서 **한 번만** 돌립니다. 두 번 돌리면 `relation "periods" already exists`
> 에러가 납니다 — 이미 만들어졌다는 뜻이니 무시하고 넘어가면 됩니다.

## 4. 로그인 계정 만들기

이 앱에는 가입 화면이 없습니다. 혼자 쓰는 앱이라 아무나 가입하지 못하게, 계정은 대시보드에서
직접 만듭니다.

1. 왼쪽 메뉴 **Authentication → Users**로 들어갑니다.
2. **Add user → Create new user**를 누릅니다.
3. 앱에서 쓸 이메일과 비밀번호를 넣습니다. 실제로 메일을 보내지 않으므로 아무 이메일이어도 됩니다.
4. **Auto Confirm User?** 체크가 켜져 있는지 확인하고(기본으로 켜져 있습니다) **Create user**를 누릅니다.
   이걸 끄면 로그인할 때 `이메일 확인이 끝나지 않은 계정이다`가 뜹니다.

비밀번호를 잊으면 같은 화면에서 사용자 줄 오른쪽 메뉴로 다시 정할 수 있습니다.

## 5. `.env.local` 채우기

앱이 내 Supabase에 접속할 주소와 키를 적는 파일입니다. 이 파일은 커밋되지 않습니다.

```bash
cp .env.local.example .env.local
```

Supabase에서 두 값을 복사해 `.env.local`에 붙여 넣습니다.

1. 프로젝트 화면 위쪽의 **Connect** 버튼을 누릅니다. (또는 **Project Settings → API Keys**)
2. **Project URL** (`https://xxxx.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`
3. **Publishable key** (`sb_publishable_…`로 시작) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

변수 이름은 `ANON_KEY`지만 publishable key를 넣으면 됩니다. 예전에 만든 프로젝트라 API Keys 화면의
**Legacy anon, service_role API keys** 탭에 `anon` 키(`eyJ…`로 시작)가 있다면 그걸 넣어도 됩니다.

> **secret 키(`sb_secret_…`)나 service_role 키는 절대 넣지 않습니다.** 이 키는 RLS를 무시하고 모든
> 데이터를 읽고 쓸 수 있어서, 브라우저로 나가면 누구나 내 데이터를 볼 수 있게 됩니다. 이 앱은 쓰지 않습니다.

공고 수집기를 쓸 거라면 같은 파일에 4단계에서 만든 계정도 적어 둡니다(선택).

```
STUDY_NOTE_EMAIL=4단계에서 만든 이메일
STUDY_NOTE_PASSWORD=4단계에서 만든 비밀번호
```

## 6. 내 컴퓨터에서 실행하기

```bash
npm run dev
```

1. 브라우저에서 [localhost:3000](http://localhost:3000)을 엽니다. 로그인 화면으로 넘어갑니다.
2. 4단계의 이메일과 비밀번호로 로그인합니다.
3. 처음 들어가면 `2026 하반기`처럼 지금 반기 이름으로 된 빈 시기 하나가 만들어져 있습니다.
4. 회사를 하나 추가하고 새로고침해 봅니다. 그대로 남아 있으면 연동이 끝난 것입니다.

끌 때는 터미널에서 `Ctrl + C`.

## 7. Vercel에 배포하기

내 컴퓨터를 꺼도, 휴대폰에서도 쓰고 싶으면 Vercel에 올립니다.

1. 1단계에서 만든 레포에 지금까지 고친 것이 있다면 먼저 푸시합니다(`.env.local`은 올라가지 않습니다).
2. [vercel.com/new](https://vercel.com/new)에서 **Import Git Repository**로 내 레포를 고릅니다.
   GitHub 권한을 물으면 그 레포에 접근을 허용합니다.
3. **Framework Preset**이 **Next.js**인지 확인합니다(레포의 `vercel.json`이 고정해 둡니다).
4. **Environment Variables**를 펼쳐 두 개를 넣습니다. 값은 `.env.local`과 같습니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Deploy**를 누르고 1~2분 기다립니다.
6. 나온 주소(`https://<프로젝트 이름>.vercel.app`)로 들어가 4단계 계정으로 로그인합니다.

이후로는 `main` 브랜치에 푸시할 때마다 자동으로 다시 배포됩니다.
Supabase 쪽에는 따로 할 일이 없습니다 — 메일을 보내지 않는 로그인이라 주소를 등록할 필요가 없습니다.

> 환경 변수를 나중에 넣거나 바꿨다면 **Deployments → 최근 배포의 ⋯ → Redeploy**로 한 번 다시
> 배포해야 반영됩니다. `NEXT_PUBLIC_`으로 시작하는 값은 빌드할 때 코드에 박히기 때문입니다.

## 8. 공고 수집하기 (선택)

채용 사이트에서 공고를 모아 앱의 **공고** 탭에 넣는 스크립트가 들어 있습니다. 자동으로 돌지
않고, 생각날 때 내 컴퓨터에서 직접 돌립니다. 지원하는 사이트는 사람인·자소설닷컴·인디스워크이고,
그 밖의 사이트는 공고 주소를 직접 넣을 수 있습니다.

```
앱에서 필터링 규칙 고르기 → collect (모으면서 거르기) → enrich (상세 채우기, 선택) → import (앱에 넣기)
```

**처음 한 번만**

1. 설정 파일을 만들고, 검색 주소와 근무 지역을 내 것으로 고칩니다.

   ```bash
   cp scripts/sources.example.json scripts/sources.json
   ```

2. 앱의 **공고** 탭 맨 위 **필터링 규칙**에서 직무(프론트엔드·백엔드), 경력(신입·경력),
   스택(Java·React …) 칩을 눌러 고릅니다. 누르면 바로 저장되고, 수집기가 이걸 읽어 거릅니다.
3. `.env.local`에 `STUDY_NOTE_EMAIL`·`STUDY_NOTE_PASSWORD`를 적어 둡니다(5단계). 적지 않으면
   돌릴 때마다 터미널에서 묻습니다.

**그다음부터는 이 순서로 돌립니다.**

```bash
node scripts/collect.mjs
node scripts/enrich.mjs scripts/out/postings-<날짜>.json
node scripts/import.mjs scripts/out/postings-<날짜>.json
```

| 명령 | 하는 일 |
|---|---|
| `collect.mjs` | `sources.json`에 적은 사이트에서 공고 목록을 모으고, 앱에서 고른 필터링 규칙으로 걸러 `scripts/out/postings-<날짜>.json`에 쌓는다. 두 번째부터는 지난번 이후에 새로 뜬 것만 모은다 |
| `enrich.mjs` | 공고를 하나씩 열어 자소서 문항·전형 조건·회사 평판을 채운다. 건너뛰어도 된다 |
| `import.mjs` | 앱과 같은 계정으로 로그인해서 공고를 넣는다. 이미 넣은 공고는 건너뛴다 |

넣기 전에 AI 코딩 도구에 "이 파일에서 지원할 만한 것만 골라 줘"라고 부탁해 더 줄여도 됩니다.
넣은 뒤 앱을 새로고침하면 **공고** 탭에 보입니다.

**검색 주소 정하는 법, 필터링 규칙이 거르는 방식, AI로 고르는 프롬프트, 사이트별 차이, 잡플래닛
평판 붙이기는 [docs/job-collector.md](docs/job-collector.md)에 단계별로 있습니다.**

> 수집기는 각 사이트의 robots.txt를 지키고, 요청 사이에 1.5초씩 쉽니다. 개인이 하루 한두 번
> 돌리는 정도로 써 주세요. 사이트 구조가 바뀌면 수집이 안 될 수 있습니다.

## 9. AI와 자소서 쓰기 (선택)

앱에 적어 둔 재료·자소서·면접 답변을 마크다운 파일 하나로 뽑을 수 있습니다. 이 파일을
ChatGPT나 Claude 같은 AI에게 주고 "이 재료로 이 문항에 답해 줘"라고 부탁하면 됩니다.

```bash
node scripts/export-materials.mjs          # scripts/out/materials.md 로 저장
node scripts/export-materials.mjs --final  # 재료는 "최종"으로 고른 것만
```

`.env.local`의 계정으로 로그인해서 읽기만 합니다. DB는 건드리지 않습니다.

---

## 막혔을 때

| 증상 | 원인과 해결 |
|---|---|
| 화면에 **Supabase 접속값이 없다** | `.env.local`이 없거나 값이 비었습니다(5단계). 값을 넣은 뒤 `npm run dev`를 껐다 켭니다. Vercel이면 환경 변수를 넣고 **Redeploy** 합니다 |
| 화면에 **데이터를 읽지 못했다** · `relation ... does not exist` | 테이블을 아직 안 만들었습니다. 3단계를 합니다 |
| 화면에 **데이터를 읽지 못했다** · `permission denied` | `schema.sql`을 끝까지 돌리지 않아 맨 아래 권한(grant)이 빠졌습니다. 파일 맨 아래 `grant ...` 문만 SQL Editor에서 다시 돌립니다. 그래도 안 되면 **Integrations → Data API**가 켜져 있는지 봅니다 |
| `이메일이나 비밀번호가 맞지 않는다` | 4단계에서 만든 계정과 다릅니다. Users 화면에서 비밀번호를 다시 정할 수 있습니다 |
| `이메일 확인이 끝나지 않은 계정이다` | 4단계의 Auto Confirm User?를 껐습니다. Users에서 그 사용자를 지우고 다시 만듭니다 |
| 오랜만에 들어갔더니 접속이 안 된다 | 무료 플랜 Supabase 프로젝트는 7일쯤 안 쓰면 일시 정지됩니다. 대시보드에서 프로젝트를 열고 **Resume project**를 누릅니다. 데이터는 그대로 남아 있습니다 |
| Vercel 빌드가 `No Output Directory named "public"`으로 실패 | 프레임워크가 Next.js로 안 잡혔습니다. 레포에 `vercel.json`이 있는지, 프로젝트 Settings의 Output Directory를 손으로 덮어쓰지 않았는지 봅니다 |
| `collect.mjs`·`import.mjs`가 `로그인 실패` | `.env.local`의 `STUDY_NOTE_EMAIL`·`STUDY_NOTE_PASSWORD`가 4단계 계정과 같은지 봅니다 |
| 수집했는데 공고가 너무 적다 | 필터링 규칙이 세게 걸렀을 수 있습니다. 결과 파일의 `excluded`에서 빠진 이유(`excluded_by`)를 보고 공고 탭에서 칩을 다시 고릅니다 |
| `collect.mjs`가 `sources.json 이 없다` | `cp scripts/sources.example.json scripts/sources.json` |
| 수집 결과가 0건 | 검색 주소가 틀렸거나 사이트 구조가 바뀌었습니다. [docs/job-collector.md](docs/job-collector.md) 참고 |

## 고쳐 쓰기

```bash
npm run dev        # 개발 서버 (localhost:3000)
npm run typecheck  # 타입 검사
npm run build      # 프로덕션 빌드
```

```
app/            페이지 (메인 · 로그인 · 저장 API)
components/     탭별 화면 (cover · material · project · interview · job · calendar)
lib/            상태(store.tsx) · 서버 액션(actions/) · DB 읽기/저장(data/) · Supabase 클라이언트
scripts/        공고 수집기와 내보내기 스크립트
supabase/       schema.sql
```

- 색·글자 크기·간격·모서리는 `app/globals.css`의 `@theme` 토큰에 모여 있습니다.
  **간격 단위가 1px입니다**(`--spacing: 1px`) — `p-12`는 12px, `gap-22`는 22px입니다.
- 마감 임박 기준일(7일), 문항 기본 글자 수(500자)는 `lib/config.ts`에서 바꿉니다.
- 테이블을 새로 만들면 RLS를 켜고 `user_id = auth.uid()` 정책과 `grant ... to authenticated`를 꼭 같이
  겁니다. `supabase/schema.sql`의 다른 테이블을 따라 쓰면 됩니다.

## 라이선스

[MIT](LICENSE)
