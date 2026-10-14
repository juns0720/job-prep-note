"use client";

import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { BTN_ADD, LABEL_FIELD } from "../ui/classes";
import { useStudyNote } from "@/lib/store";

/**
 * 프로젝트 탭. 몇 개 안 돼서 목록·상세로 나누지 않고 카드를 세로로 쌓아 한 화면에 다 보여준다.
 * 이름 · 설명 · 키워드 셋 다 바로 고치고 바로 저장한다.
 * 글이 길어지면 칸이 같이 늘어난다 — 안에서 스크롤하지 않는다.
 */
export function ProjectList() {
  const s = useStudyNote();

  return (
    <div>
      <div className="mb-8 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">프로젝트 {s.projects.length}개</span>
        <button type="button" onClick={s.addProject} className={BTN_ADD}>
          + 추가
        </button>
      </div>

      {s.projects.length === 0 && (
        <div className="rounded-card border border-dashed border-field px-20 py-56 text-center">
          <div className="mb-14 text-14 text-muted">프로젝트를 추가하면 설명과 키워드를 적을 수 있다.</div>
          <button
            type="button"
            onClick={s.addProject}
            className="rounded-btn bg-accent px-16 py-10 text-14 font-semibold text-white hover:bg-accent-hover"
          >
            프로젝트 추가
          </button>
        </div>
      )}

      <div className="flex flex-col gap-14">
        {s.projects.map((p) => (
          <div key={p.id} className="rounded-card border border-line p-20">
            <div className="flex items-start gap-10">
              {/* 이름은 한 줄짜리라 줄바꿈은 지운다. 길어지면 줄이 접혀 칸이 늘어난다. */}
              <AutoGrowTextarea
                value={p.name}
                onChange={(e) => s.setProject(p.id, { name: e.target.value.replace(/\n/g, "") })}
                placeholder="프로젝트 명"
                aria-label="프로젝트 명"
                className="mb-14 min-w-0 flex-1 resize-none overflow-hidden rounded-input border border-transparent bg-surface px-10 py-9 text-145 leading-input font-semibold tracking-name text-ink outline-none focus:border-accent focus:bg-white"
              />
              <button
                type="button"
                onClick={() => s.removeProject(p)}
                className="mt-4 px-8 py-10 text-12 font-medium text-muted hover:text-rejected"
              >
                삭제
              </button>
            </div>

            <div className={LABEL_FIELD}>프로젝트 설명</div>
            <AutoGrowTextarea
              value={p.description}
              onChange={(e) => s.setProject(p.id, { description: e.target.value })}
              placeholder="무엇을 만들었고 무엇을 맡았는지 적는다."
              className="mb-14 w-full resize-none overflow-hidden rounded-btn border border-line px-13 py-11 text-14 leading-memo text-body outline-none focus:border-accent"
            />

            <div className={LABEL_FIELD}>키워드</div>
            <AutoGrowTextarea
              value={p.keywords}
              onChange={(e) => s.setProject(p.id, { keywords: e.target.value })}
              placeholder="쉼표로 이어 쓴다. Spring Boot, JPA, 동시성 ..."
              className="w-full resize-none overflow-hidden rounded-btn border border-line px-13 py-11 text-14 leading-input text-body outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
