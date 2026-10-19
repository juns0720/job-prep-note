-- 2026-10-19 업데이트
-- 이 날짜 전에 schema.sql로 테이블을 만들었다면, 새 코드를 배포하기 전에 SQL Editor에서
-- 이 파일 전체를 한 번 실행한다. 새로 설치하는 경우에는 schema.sql만 실행하면 된다.
--
-- 1. 면접 질문 · 주제 이름 · 재료 컨셉 이름도 쓰는 대로 저장한다 (저장 순서 칸 추가)
-- 2. 자기소개서 화면의 내 링크(포트폴리오·이력서)
-- 3. 인적사항 탭과 첨부 파일 버킷

-- 1. 저장 순서 칸
alter table interview_questions
  add column save_tab text,
  add column save_seq bigint not null default 0;

alter table topics
  add column save_tab text,
  add column save_seq bigint not null default 0;

alter table material_groups
  add column save_tab text,
  add column save_seq bigint not null default 0;

-- 2. 내 링크
create table profile_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  portfolio text not null default '',
  resume text not null default '',
  updated_at timestamptz not null default now()
);

alter table profile_links enable row level security;

create policy "profile_links는 본인 것만" on profile_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. 인적사항
create table profile_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  kind text not null default 'fields' check (kind in ('fields', 'list', 'text')),
  columns jsonb not null default '[]'::jsonb,
  note text not null default '',
  body text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0
);

create index profile_sections_user_idx on profile_sections (user_id, sort_order);

create table profile_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid not null references profile_sections(id) on delete cascade,
  label text not null default '',
  value text not null default '',
  note text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0
);

create index profile_fields_section_idx on profile_fields (section_id, sort_order);

create table profile_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid not null references profile_sections(id) on delete cascade,
  cells jsonb not null default '{}'::jsonb,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0
);

create index profile_entries_section_idx on profile_entries (section_id, sort_order);

-- 증명사진, 성적증명서, 포트폴리오·이력서 Word 같은 첨부 파일. 파일 자체는 Storage의
-- profile-files 버킷에 `{user_id}/{id}.{확장자}`로 둔다(Storage 키에 한글을 못 쓴다).
-- 원래 파일 이름은 file_name에 둔다.
--   photo     증명사진. 화면에 미리보기로 보인다
--   document  그 밖의 서류
create table profile_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'document' check (kind in ('photo', 'document')),
  label text not null default '',
  path text not null,
  file_name text not null default '',
  mime text not null default '',
  size bigint not null default 0,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  save_tab text,
  save_seq bigint not null default 0
);

create index profile_files_user_idx on profile_files (user_id, sort_order);

alter table profile_sections enable row level security;
alter table profile_fields enable row level security;
alter table profile_entries enable row level security;
alter table profile_files enable row level security;

create policy "profile_sections는 본인 것만" on profile_sections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profile_fields는 본인 것만" on profile_fields
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profile_entries는 본인 것만" on profile_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profile_files는 본인 것만" on profile_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 첨부 파일 버킷. 공개하지 않고, 내 폴더(`{user_id}/...`)만 읽고 쓴다. 화면은 잠깐 쓰는
-- 서명 URL로 보여 준다. 한 파일 20MB까지.
insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-files', 'profile-files', false, 20971520)
on conflict (id) do nothing;

create policy "profile-files는 본인 폴더만 읽기" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile-files는 본인 폴더만 올리기" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile-files는 본인 폴더만 고치기" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile-files는 본인 폴더만 지우기" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- 권한
grant select, insert, update, delete on
  profile_links, profile_sections, profile_fields, profile_entries, profile_files
to authenticated;
