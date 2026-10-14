# job-prep-note

자기소개서, 면접 답변, 채용 공고, 전형 일정을 정리하는 개인용 웹앱입니다.
본인의 Supabase 계정에 데이터를 저장하고, Vercel에 배포해 사용합니다.

| 탭 | 사용 방법 |
|---|---|
| 자기소개서 | 지원 시기별로 회사를 추가하고 문항과 답변을 작성합니다. 글자 수, 마감일, 지원 상태를 확인하고 회사별로 마크다운 파일을 내려받습니다 |
| 재료 | 자소서에 쓸 경험과 문항을 컨셉별로 모읍니다. 사용할 재료는 "최종"으로 표시합니다 |
| 프로젝트 | 프로젝트 이름, 설명, 키워드를 기록합니다 |
| 면접 준비 | 주제별로 예상 질문, 키워드, 답변을 정리합니다 |
| 공고 | 수집한 공고를 확인하고 지원할 공고를 자기소개서 탭에 추가합니다 |
| 캘린더 | 마감일과 전형 일정을 월별로 확인합니다 |

## 목차

처음 사용한다면 0~6단계를 진행합니다. 웹 배포, 공고 수집, AI용 자료 내보내기는 필요할 때 설정합니다.

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

- [문제 해결](#문제-해결)

## 0. 준비물

- [Node.js](https://nodejs.org) 20 이상, [Git](https://git-scm.com)
- [GitHub](https://github.com), [Supabase](https://supabase.com) 계정
- 웹에 배포하려면 [Vercel](https://vercel.com) 계정

아래 명령어는 터미널에서 실행합니다. macOS는 터미널 앱, Windows는 PowerShell을 사용하면 됩니다.

## 1. 내 레포 만들고 내려받기

1. 이 저장소의 GitHub 페이지에서 **Use this template → Create a new repository**를 누릅니다.
2. 저장소 이름과 공개 여부를 정합니다.
3. 생성한 저장소를 내려받고 패키지를 설치합니다.

```bash
git clone https://github.com/<내 아이디>/<레포 이름>.git
cd <레포 이름>
npm install
```

## 2. Supabase 프로젝트 만들기

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 **New project**를 누릅니다.
2. 프로젝트 이름과 DB 비밀번호를 정합니다. 한국에서 사용한다면 Region은 **Northeast Asia (Seoul)**을 선택합니다.
3. **Enable Data API**를 켜 둔 상태로 프로젝트를 생성합니다.

## 3. 테이블 만들기

1. [`supabase/schema.sql`](supabase/schema.sql)의 전체 내용을 복사합니다.
2. Supabase의 **SQL Editor**에 붙여 넣고 **Run**을 누릅니다.
3. `Success. No rows returned`가 나오면 완료입니다. 이 작업은 새 프로젝트에서 한 번만 진행합니다.

## 4. 로그인 계정 만들기

앱에는 회원가입 화면이 없습니다. Supabase에서 계정을 직접 만듭니다.

1. **Authentication → Users → Add user → Create new user**로 들어갑니다.
2. 로그인에 사용할 이메일과 비밀번호를 입력합니다.
3. **Auto Confirm User?**를 선택하고 **Create user**를 누릅니다.

## 5. `.env.local` 채우기

프로젝트 폴더에서 실행합니다.

```bash
cp .env.local.example .env.local
```

Supabase의 **Connect** 또는 **Project Settings → API Keys**에서 Project URL과 Publishable key를 복사해 넣습니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

**secret 키나 service_role 키는 사용하지 마세요.** 기존 프로젝트의 `anon` 키도 사용할 수 있습니다.

## 6. 내 컴퓨터에서 실행하기

```bash
npm run dev
```

[localhost:3000](http://localhost:3000)에서 4단계 계정으로 로그인합니다.
자기소개서 탭에 회사를 추가하고, 새로고침해 저장되는지 확인합니다.

종료하려면 터미널에서 `Ctrl + C`를 누릅니다.

## 7. Vercel에 배포하기

컴퓨터나 휴대폰에서 배포 주소로 접속하려면 진행합니다.

1. [Vercel](https://vercel.com/new)의 **Import Git Repository**에서 1단계 저장소를 선택합니다.
2. **Framework Preset**이 **Next.js**인지 확인합니다.
3. **Environment Variables**에 `.env.local`과 같은 값으로 아래 두 변수를 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**를 누릅니다.
5. 배포 주소에서 4단계 계정으로 로그인합니다.

환경 변수를 나중에 변경했다면 **Deployments → 최근 배포의 ⋯ → Redeploy**로 다시 배포합니다.

## 8. 공고 수집하기 (선택)

사람인, 자소설닷컴, 인디스워크의 공고를 가져올 수 있습니다.
공고 수집은 필요할 때 컴퓨터에서 직접 실행합니다.

처음 설정과 실행 방법은 [공고 수집 가이드](docs/job-collector.md)를 참고하세요.
가져온 공고는 **공고** 탭에서 확인하고, 지원할 공고의 **자기소개서에 추가**를 누르면 됩니다.

## 9. AI와 자소서 쓰기 (선택)

앱에 작성한 재료, 자기소개서, 면접 답변을 하나의 파일로 내보낼 수 있습니다.
먼저 `.env.local`에 앱 로그인 계정을 입력합니다.

```dotenv
STUDY_NOTE_EMAIL=앱에 로그인하는 이메일
STUDY_NOTE_PASSWORD=앱에 로그인하는 비밀번호
```

```bash
node scripts/export-materials.mjs
```

생성된 `scripts/out/materials.md`를 ChatGPT나 Claude에 첨부해 자소서 작성에 활용합니다.
재료 중 "최종"으로 표시한 것만 포함하려면 명령어 뒤에 `--final`을 붙입니다.

## 문제 해결

| 증상 | 해결 방법 |
|---|---|
| Supabase 접속값이 없다는 메시지 | 5단계의 값을 확인하고 개발 서버를 다시 실행합니다. Vercel에서는 환경 변수를 확인하고 **Redeploy** 합니다 |
| `relation ... does not exist` | 3단계의 SQL을 실행합니다 |
| `permission denied` | `schema.sql` 하단의 `grant ...` 구문을 실행하고 **Enable Data API** 설정을 확인합니다 |
| 로그인이 안 됨 | 입력한 이메일과 비밀번호를 확인합니다. **Authentication → Users**에서 이메일 확인 상태를 확인하거나 비밀번호를 재설정합니다 |
| 한동안 사용하지 않은 뒤 접속이 안 됨 | Supabase 프로젝트가 일시 정지되어 있다면 **Resume project**를 누릅니다 |
| Vercel 빌드에서 `No Output Directory named "public"` 오류 | Framework Preset을 **Next.js**로 설정하고, Output Directory를 수동으로 지정했다면 해제합니다 |

## 라이선스

[MIT](LICENSE)
