-- 인적사항 탭
-- 채용 사이트 지원서에 넣는 인적사항을 모아 둔다. 클로드가 공채 사이트 양식을 채울 때 여기서
-- 값을 읽는다(scripts/export-profile.mjs, docs/profile-autofill.md).
--
-- 양식마다 칸이 달라서 칸을 테이블 컬럼으로 고정하지 않는다. 섹션(기본 인적사항, 학력 ...)
-- 아래에 항목을 행으로 둬서, 양식에서 처음 보는 칸이 나오면 마이그레이션 없이 행만 더한다.
--
-- 섹션 형식(kind)
--   fields  항목 · 값 · 비고 줄 (기본 인적사항, 주소, 병역 ...)  -> profile_fields
--   list    같은 칸을 가진 여러 건 (학력, 자격증, 수상 ...)        -> profile_entries
--           칸 이름은 columns([{id, name, wide}])에 두고, 건마다 cells({칸 id: 값})에 담는다.
--           칸 이름을 바꿔도 건마다 값을 고치지 않아도 되게 id로 묶는다.
--   text    긴 글 하나 (경력기술서, 지원처별 입력 기록)             -> body
-- note는 섹션마다 값을 양식에 맞추는 규칙을 적는 칸이다.
--
-- 저장 큐(lib/save-queue.ts)가 쓰는 대로 보내므로 save_tab·save_seq를 같이 둔다(0011과 같다).

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
