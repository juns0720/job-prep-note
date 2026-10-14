"use client";

import { InterviewQuestionItem } from "./InterviewQuestionItem";
import { BTN_BACK } from "../ui/classes";
import { useStudyNote } from "@/lib/store";

export function InterviewDetail() {
  const s = useStudyNote();

  const cur = s.topics.find((t) => t.id === s.topicId) ?? s.topics[0] ?? { id: "", name: "", questions: [] };
  // 하나라도 펼쳐져 있으면 "답변 모두 접기", 전부 접혀 있으면 "답변 모두 펼치기".
  const anyOpen = cur.questions.some((q) => !s.closed[q.id]);

  return (
    <div>
      {s.narrow && (
        <button type="button" onClick={s.backToSide} className={BTN_BACK}>
          ← 주제 목록
        </button>
      )}

      <div className="flex flex-wrap items-end gap-12">
        <div className="min-w-0 flex-[1_1_200px]">
          <h1 className="m-0 text-title font-bold tracking-title">{cur.name}</h1>
          <div className="mt-5 text-13 text-muted">질문 {cur.questions.length}개</div>
        </div>
        <button
          type="button"
          onClick={() => s.toggleAll(cur.questions, anyOpen)}
          className="rounded-input border border-field bg-white px-15 py-12 text-13 font-medium text-body hover:bg-hover"
        >
          {anyOpen ? "답변 모두 접기" : "답변 모두 펼치기"}
        </button>
        <button
          type="button"
          onClick={() => s.addInterviewQuestion(cur.id)}
          className="rounded-btn bg-accent px-16 py-12 text-135 font-semibold text-white hover:bg-accent-hover"
        >
          + 질문 추가
        </button>
      </div>

      <div className="mt-18 border-t border-line">
        {cur.questions.map((q, i) => (
          <div key={q.id} className="border-b border-divider px-2 py-18">
            <InterviewQuestionItem topicId={cur.id} question={q} index={i} />
          </div>
        ))}
        {cur.questions.length === 0 && (
          <div className="px-20 py-52 text-center text-135 text-muted">
            이 주제에는 아직 질문이 없다.
          </div>
        )}
      </div>
    </div>
  );
}
