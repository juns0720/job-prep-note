-- job-prep-note 스키마
-- Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여 넣고 Run 한 번이면 끝난다.
-- 새 프로젝트에서 한 번만 돌린다(테이블이 이미 있으면 에러가 난다).
--
-- 모든 테이블에 RLS를 켜고 "본인 것만" 정책을 건다. 앱과 수집 스크립트는 공개 키 +
-- 로그인 세션으로만 접근하므로, 로그인한 사람은 자기 행만 읽고 쓸 수 있다.
-- 맨 아래에서 로그인한 사용자(authenticated)에게 테이블 권한을 준다. 2026년 5월 이후
-- 만든 Supabase 프로젝트는 SQL로 만든 테이블을 앱(Data API)에 자동으로 열어 주지 않는다.
--
-- 저장 순서 컬럼(save_tab · save_seq)
--   save_tab  마지막으로 이 행을 고친 브라우저 탭. 탭을 열 때마다 새로 만든다.
--   save_seq  그 탭 안에서 저장 요청에 붙인 번호. 클수록 나중에 보낸 것이다.
--   같은 행에 대한 저장 요청이 뒤바뀌어 도착해도 옛 값이 새 값을 덮지 않게
--   lib/data/save.ts가 이 둘을 보고 반영 여부를 정한다.

create extension if not exists pgcrypto;
create extension if not exists moddatetime schema extensions;

-- ---------------------------------------------------------------------------
-- 지원 시기
-- period는 문자열이다 — periods는 FK 대상이 아니라 "이름 목록"을 들고 있을 뿐이다.
-- 회사가 하나도 없는 시기도 화면에 남아 있어야 하고, 시기 이름을 고치면
-- companies.period도 같이 바꿔야 해서 두 테이블 다 필요하다.
-- ---------------------------------------------------------------------------
create table periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table periods enable row level security;

create policy "periods는 본인 것만" on periods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 회사 (자기소개서)
-- status: draft 미제출 · writing 작성 중 · applied 지원 완료 ·
--         docs_passed 서류 합격 · coding_test 코딩테스트 · assignment 과제 ·
--         aptitude 인적성 · interview 면접 · passed 합격 · rejected 불합격
-- ---------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  name text not null default '',
  role text not null default '',
  due date,
  status text not null default 'draft',
  url text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0,
  constraint companies_status_check
    check (status in (
      'draft', 'writing', 'applied',
      'docs_passed', 'coding_test', 'assignment', 'aptitude', 'interview',
      'passed', 'rejected'
    ))
);

create index companies_user_period_idx on companies (user_id, period);

alter table companies enable row level security;

create policy "companies는 본인 것만" on companies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger companies_set_updated_at
  before update on companies
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- 자소서 문항
-- ---------------------------------------------------------------------------
create table cover_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  body text not null default '',
  char_limit int not null default 500,
  answer text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0
);

create index cover_questions_company_idx on cover_questions (company_id, sort_order);

alter table cover_questions enable row level security;

create policy "cover_questions는 본인 것만" on cover_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 전형 일정
-- 회사마다 여러 개 적는다. 면접이 1·2차로 나뉘어도 따로 적을 수 있게 상태와 따로 둔다.
-- 캘린더 탭이 이것과 회사 마감일을 같이 보여준다. 날짜를 모르면 비워 둔다(캘린더에는 안 뜬다).
-- ---------------------------------------------------------------------------
create table company_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null default 'interview'
    check (kind in ('docs_result', 'coding_test', 'assignment', 'aptitude', 'interview', 'other')),
  date date,
  memo text not null default '',
  created_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0
);

create index company_events_user_idx on company_events (user_id, date);

alter table company_events enable row level security;

create policy "company_events는 본인 것만" on company_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 면접 주제
-- ---------------------------------------------------------------------------
create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table topics enable row level security;

create policy "topics는 본인 것만" on topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 면접 질문
-- ---------------------------------------------------------------------------
create table interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  body text not null default '',
  keywords text[] not null default '{}',
  answer text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

create index interview_questions_topic_idx on interview_questions (topic_id, sort_order);

alter table interview_questions enable row level security;

create policy "interview_questions는 본인 것만" on interview_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 재료 — 컨셉
-- 갈등 상황, 기술 답변 같은 큰 컨셉을 먼저 만들고 그 아래에 자소서 문항을 모은다.
-- ---------------------------------------------------------------------------
create table material_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table material_groups enable row level security;

create policy "material_groups는 본인 것만" on material_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 재료 — 문항
-- title은 접어 둘 때 보이는 한 줄 주제, body는 내용이다. 주제가 비어 있으면 화면이
-- 내용의 첫 줄을 흐리게 대신 보여준다. final은 실제로 자소서에 쓸 것만 골라 둔 표시다.
-- 순서는 내용과 따로 저장되므로 order_tab · order_seq를 따로 둔다.
-- ---------------------------------------------------------------------------
create table materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  group_id uuid not null references material_groups(id) on delete cascade,
  title text not null default '',
  final boolean not null default false,
  save_tab text,
  save_seq bigint not null default 0,
  order_tab text,
  order_seq bigint not null default 0
);

create index materials_group_idx on materials (group_id, sort_order);

alter table materials enable row level security;

create policy "materials는 본인 것만" on materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 프로젝트
-- 키워드는 쉼표로 이어 쓴 글 그대로 둔다. 적는 사람이 쓴 순서와 묶음을 그대로 보려고
-- 배열로 나누지 않았다.
-- ---------------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  description text not null default '',
  keywords text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0
);

create index projects_user_idx on projects (user_id, sort_order);

alter table projects enable row level security;

create policy "projects는 본인 것만" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 수집한 채용 공고
-- 수집기(scripts/collect.mjs)가 모아 온 것을 scripts/import.mjs가 여기에 넣는다.
-- 자소서를 쓸 회사(companies)와는 분리한다 — 수집 결과가 지원 기록을 오염시키면 안 된다.
-- 마음에 드는 공고만 앱에서 자기소개서로 옮긴다.
-- ---------------------------------------------------------------------------
create table job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 어디서 가져왔나
  source text not null,                       -- saramin | jasoseol | inthiswork | manual
  external_id text,                           -- 사이트 안에서의 공고 id (없을 수 있다)
  url text not null,

  -- 공고 내용. 사이트마다 주는 것이 달라서 없으면 빈 문자열로 둔다.
  company text not null default '',
  title text not null default '',
  location text not null default '',
  career text not null default '',            -- "신입", "경력 3년↑" 같은 원문
  employment text not null default '',        -- 정규직 / 계약직
  sector text not null default '',            -- 직무·스택 원문
  due_text text not null default '',          -- "~ 10/25(일)", "상시채용" 같은 원문
  due date,                                   -- 날짜로 읽어낸 것만 채운다

  -- 훑어보고 남기는 것
  picked boolean not null default false,      -- 자기소개서로 옮긴 것
  dismissed boolean not null default false,   -- 안 볼 것
  note text not null default '',              -- 고른 이유 / 메모

  raw jsonb,                                  -- 파서가 본 원본 조각
  collected_at timestamptz not null default now(),

  -- 상세 (scripts/enrich.mjs가 채운다)
  apply_url text not null default '',         -- 실제로 지원하는 회사 채용 페이지
  process jsonb,                              -- 전형 조건. 사이트가 주는 대로 담는다
  questions jsonb,                            -- 자소서 문항 [{ number, question, limit, include_space }]
  -- 지운 공고. 행을 지우지 않고 표시만 남긴다. unique (user_id, url) 때문에
  -- 다시 수집해도 임포터가 "이미 있는 것"으로 보고 건너뛴다 — 지운 공고가 되살아나지 않는다.
  deleted boolean not null default false,
  company_info jsonb,                         -- 잡플래닛 평점·연봉 (매칭된 회사명과 주소 포함)

  save_tab text,
  save_seq bigint not null default 0,

  -- 같은 공고를 다시 수집해도 한 줄만 남는다
  unique (user_id, url)
);

create index job_postings_user_collected_idx on job_postings (user_id, collected_at desc);
create index job_postings_user_picked_idx on job_postings (user_id, picked) where picked;
create index job_postings_user_alive_idx
  on job_postings (user_id, collected_at desc)
  where not deleted;

alter table job_postings enable row level security;

create policy "job_postings는 본인 것만" on job_postings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 권한
-- 로그인한 사용자만 테이블에 접근한다. 어느 행을 볼 수 있는지는 위의 RLS 정책이 정한다.
-- 로그인하지 않은 요청(anon)에는 아무 권한도 주지 않는다.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  periods, companies, cover_questions, company_events,
  topics, interview_questions, material_groups, materials,
  projects, job_postings
to authenticated;
