# job-prep-note

자기소개서, 인적사항, 면접 답변, 채용 공고와 전형 일정을 정리하는 개인용 웹앱입니다.
데이터는 본인의 Supabase 계정에 저장하며, 앱은 Vercel에 배포해 사용합니다.

| 탭 | 사용 방법 |
|---|---|
| 자기소개서 | 지원 시기별로 회사, 문항과 답변을 정리합니다. 글자 수, 마감일과 지원 상태를 확인하고 회사별로 마크다운 파일을 내려받습니다. 포트폴리오와 이력서 링크도 저장해 복사할 수 있습니다 |
| 인적사항 | 기본 정보, 학력, 자격증 등 지원서에 넣을 내용과 증명사진, 서류 파일을 모읍니다 |
| 재료 | 자소서에 쓸 경험과 문항을 컨셉별로 모읍니다. 사용할 문항은 **최종**으로 표시합니다 |
| 프로젝트 | 프로젝트 이름, 설명, 키워드를 기록합니다 |
| 면접 준비 | 주제별로 예상 질문, 키워드, 답변을 정리합니다 |
| 공고 | 수집한 공고를 확인하고 지원할 공고를 자기소개서 탭에 추가합니다 |
| 캘린더 | 마감일과 전형 일정을 월별로 확인합니다 |

## 목차

처음 사용한다면 0~6단계를 따라 앱을 배포하세요. 공고 수집과 지원서 인적사항 입력은 배포 후 필요할 때 설정합니다.

0. [준비물](#0-준비물)
1. [내 저장소 만들기](#1-내-저장소-만들기)
2. [Supabase 프로젝트 만들기](#2-supabase-프로젝트-만들기)
3. [테이블 만들기](#3-테이블-만들기)
4. [로그인 계정 만들기](#4-로그인-계정-만들기)
5. [Vercel에 배포하기](#5-vercel에-배포하기)
6. [앱 사용하기](#6-앱-사용하기)

- [AI로 공고 수집하기 (선택)](#ai로-공고-수집하기-선택)
- [AI로 지원서 인적사항 채우기 (선택)](#ai로-지원서-인적사항-채우기-선택)
- [업데이트하기](#업데이트하기)
- [문제 해결](#문제-해결)

## 0. 준비물

[GitHub](https://github.com), [Supabase](https://supabase.com), [Vercel](https://vercel.com) 계정이 필요합니다.
배포 설정은 브라우저에서 진행합니다.

## 1. 내 저장소 만들기

1. 이 저장소의 GitHub 페이지에서 **Use this template → Create a new repository**를 누릅니다.
2. 저장소 이름과 공개 여부를 정하고 생성합니다.

## 2. Supabase 프로젝트 만들기

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 **New project**를 누릅니다.
2. 프로젝트 이름과 DB 비밀번호를 정합니다. 한국에서 사용한다면 Region은 **Northeast Asia (Seoul)**을 선택합니다.
3. **Enable Data API**를 켜 둔 상태로 프로젝트를 생성합니다.

## 3. 테이블 만들기

1. GitHub에서 [`supabase/schema.sql`](supabase/schema.sql)을 열어 전체 내용을 복사합니다.
2. Supabase의 **SQL Editor**에 붙여 넣고 **Run**을 누릅니다.
3. `Success. No rows returned`가 나오면 완료입니다. 이 작업은 새 프로젝트에서 한 번만 진행합니다.

## 4. 로그인 계정 만들기

앱에는 회원가입 화면이 없습니다. Supabase에서 계정을 직접 만듭니다.

1. **Authentication → Users → Add user → Create new user**로 들어갑니다.
2. 로그인에 사용할 이메일과 비밀번호를 입력합니다.
3. **Auto Confirm User?**를 선택하고 **Create user**를 누릅니다.

## 5. Vercel에 배포하기

1. [Vercel](https://vercel.com/new)의 **Import Git Repository**에서 1단계 저장소를 선택합니다.
2. **Framework Preset**이 **Next.js**인지 확인합니다.
3. Supabase의 **Connect** 또는 **Project Settings → API Keys**에서 Project URL과 Publishable key를 복사합니다.
4. Vercel의 **Environment Variables**에 아래 두 변수를 추가합니다.

   | 변수 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (`https://xxxx.supabase.co`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Publishable key (`sb_publishable_…`) |

   **secret 키나 service_role 키는 넣지 마세요.** 기존 프로젝트의 `anon` 키도 사용할 수 있습니다.

5. **Deploy**를 누르고 배포가 완료되면 앱 주소를 엽니다.

환경 변수를 나중에 변경했다면 **Deployments → 최근 배포의 ⋯ → Redeploy**로 다시 배포합니다.

## 6. 앱 사용하기

배포 주소에서 4단계 계정으로 로그인합니다.
**자기소개서** 탭에 회사를 추가한 뒤 **저장됨**이 표시되면 새로고침해 회사가 남아 있는지 확인합니다.
이후에도 같은 배포 주소로 접속해 사용합니다.

## AI로 공고 수집하기 (선택)

AI 코딩 도구에서 1단계에서 만든 저장소를 열고, 원하는 조건의 공고를 수집해 앱에 넣어 달라고 요청합니다.

요청 예시와 처음 설정은 [공고 수집 가이드](docs/job-collector.md)를 참고하세요.
가져온 공고는 배포된 앱의 **공고** 탭에서 확인합니다.

## AI로 지원서 인적사항 채우기 (선택)

AI가 **인적사항** 탭에 저장한 이름, 연락처, 학력 등을 채용 사이트 지원서에 입력하고 임시 저장합니다.
[Aside](https://aside.com) 브라우저가 필요합니다.

1. [aside.com/download](https://aside.com/download)에서 Aside를 설치하고 로그인합니다.
2. AI 코딩 도구에서 1단계 저장소를 열고 "docs/ai/profile-autofill.md를 보고 Aside를 연결해 줘"라고 요청합니다.
3. 앱의 **인적사항** 탭을 채우고, Aside에서 지원서를 열어 둔 채 AI에게 채워 달라고 요청합니다.

주민등록번호 등 AI가 입력하지 않는 항목을 직접 채우고, 내용을 확인한 뒤 최종 제출합니다.
요청 예시와 자세한 순서는 [인적사항 자동 입력 가이드](docs/profile-autofill.md)를 참고하세요.

## 업데이트하기

이 템플릿의 변경 사항을 내 저장소에 반영할 수 있습니다.
AI 코딩 도구에서 내 저장소를 열고 요청하세요.

```text
https://github.com/juns0720/job-prep-note 의 최신 변경을 내 저장소에 가져와 줘.
Supabase에서 따로 실행해야 할 SQL이 있으면 알려 줘.
```

추가로 실행할 SQL이 있다면 3단계처럼 Supabase **SQL Editor**에 붙여 넣고 **Run**을 누릅니다.
변경 사항이 Vercel에 배포되면 앱을 새로고침해 확인합니다.

## 문제 해결

| 증상 | 해결 방법 |
|---|---|
| Supabase 접속값이 없다는 메시지 | 5단계의 Vercel 환경 변수 두 개를 확인하고 **Redeploy**를 누릅니다 |
| `relation ... does not exist` | 3단계의 SQL을 실행합니다. 업데이트한 뒤에 이 메시지가 나오면 AI에게 실행할 SQL이 있는지 물어봅니다 |
| `permission denied` | `schema.sql` 맨 아래 `grant`로 시작하는 부분을 복사해 SQL Editor에서 실행합니다. 2단계의 **Enable Data API**도 켜져 있는지 확인합니다 |
| 로그인이 안 됨 | 입력한 이메일과 비밀번호를 확인합니다. **Authentication → Users**에서 이메일 확인 상태를 확인하거나 비밀번호를 재설정합니다 |
| 한동안 사용하지 않은 뒤 접속이 안 됨 | Supabase 프로젝트가 일시 정지되어 있다면 **Resume project**를 누릅니다 |
| Vercel 빌드에서 `No Output Directory named "public"` 오류 | Framework Preset을 **Next.js**로 설정하고, Output Directory를 수동으로 지정했다면 해제합니다 |

## 라이선스

[MIT](LICENSE)
