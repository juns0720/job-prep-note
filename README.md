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

처음 사용한다면 0~6단계 순서로 배포합니다. 공고 수집과 AI용 자료 내보내기는 선택 사항입니다.

0. [준비물](#0-준비물)
1. [내 저장소 만들기](#1-내-저장소-만들기)
2. [Supabase 프로젝트 만들기](#2-supabase-프로젝트-만들기)
3. [테이블 만들기](#3-테이블-만들기)
4. [로그인 계정 만들기](#4-로그인-계정-만들기)
5. [Vercel에 배포하기](#5-vercel에-배포하기)
6. [앱 사용하기](#6-앱-사용하기)

- [AI로 공고 수집하기 (선택)](#ai로-공고-수집하기-선택)
- [AI와 자소서 쓰기 (선택)](#ai와-자소서-쓰기-선택)
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

   **secret 키나 service_role 키는 사용하지 마세요.** 기존 프로젝트의 `anon` 키도 사용할 수 있습니다.

5. **Deploy**를 누르고 배포가 완료되면 앱 주소를 엽니다.

환경 변수를 나중에 변경했다면 **Deployments → 최근 배포의 ⋯ → Redeploy**로 다시 배포합니다.

## 6. 앱 사용하기

배포 주소에서 4단계 계정으로 로그인합니다.
자기소개서 탭에 회사를 추가하고, 새로고침해 저장되는지 확인합니다.
이후에는 이 주소로 접속해 사용하면 됩니다.

## AI로 공고 수집하기 (선택)

AI 코딩 도구에서 1단계 저장소를 열고 원하는 공고 조건을 알려 주세요.
AI가 수집 설정부터 앱에 가져오기까지 처리하도록 요청하면 됩니다.

요청 예시와 처음 설정은 [공고 수집 가이드](docs/job-collector.md)를 참고하세요.
가져온 공고는 배포된 앱의 **공고** 탭에서 확인합니다.

## AI와 자소서 쓰기 (선택)

AI 코딩 도구에서 저장소를 열고, 앱에 작성한 재료와 답변을 내보내도록 요청할 수 있습니다.

```text
앱에 저장한 재료, 자기소개서, 면접 답변을 scripts/export-materials.mjs로 내보내 줘.
재료는 "최종"으로 표시한 것만 포함해 줘.
필요한 실행 환경과 연결 설정은 준비하고, 빠진 접속 정보가 있으면 알려 줘.
```

처음 연결할 때는 5단계의 Supabase 접속값과 4단계의 앱 로그인 계정이 필요합니다.
생성된 `scripts/out/materials.md`를 ChatGPT나 Claude에 첨부해 자소서 작성에 활용합니다.

## 문제 해결

| 증상 | 해결 방법 |
|---|---|
| Supabase 접속값이 없다는 메시지 | Vercel의 환경 변수 두 개를 확인하고 **Redeploy** 합니다(5단계) |
| `relation ... does not exist` | 3단계의 SQL을 실행합니다 |
| `permission denied` | `schema.sql` 하단의 `grant ...` 구문을 실행하고 **Enable Data API** 설정을 확인합니다 |
| 로그인이 안 됨 | 입력한 이메일과 비밀번호를 확인합니다. **Authentication → Users**에서 이메일 확인 상태를 확인하거나 비밀번호를 재설정합니다 |
| 한동안 사용하지 않은 뒤 접속이 안 됨 | Supabase 프로젝트가 일시 정지되어 있다면 **Resume project**를 누릅니다 |
| Vercel 빌드에서 `No Output Directory named "public"` 오류 | Framework Preset을 **Next.js**로 설정하고, Output Directory를 수동으로 지정했다면 해제합니다 |

## 라이선스

[MIT](LICENSE)
