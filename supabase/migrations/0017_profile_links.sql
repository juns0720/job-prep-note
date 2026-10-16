-- 지원서에 붙여 넣을 내 링크 (포트폴리오·이력서)
-- 자기소개서 화면에 두고, 회사에 낼 때 복사해 쓴다. 사용자마다 한 줄이다.

create table profile_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  portfolio text not null default '',
  resume text not null default '',
  updated_at timestamptz not null default now()
);

alter table profile_links enable row level security;

create policy "profile_links는 본인 것만" on profile_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
