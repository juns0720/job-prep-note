-- 면접 질문·주제 이름·컨셉 이름도 타이핑하는 대로 저장 큐(lib/save-queue.ts)로 보낸다
-- 지금까지는 편집 칸에 써 두었다가 [저장]을 눌러야 서버 액션으로 저장했다. 저장을 누르기 전에
-- 다른 질문·주제로 옮기거나 새로고침하면 쓴 것이 사라졌다.
--
-- 저장 큐는 같은 탭의 요청 순서를 save_tab·save_seq로 지킨다(0011과 같다).

alter table interview_questions
  add column save_tab text,
  add column save_seq bigint not null default 0;

alter table topics
  add column save_tab text,
  add column save_seq bigint not null default 0;

alter table material_groups
  add column save_tab text,
  add column save_seq bigint not null default 0;
