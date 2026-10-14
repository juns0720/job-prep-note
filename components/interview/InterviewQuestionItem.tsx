"use client";

import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { BTN_ROW_TEXT, LABEL_MINI } from "../ui/classes";
import { useStudyNote } from "@/lib/store";
import { ordinal } from "@/lib/text";
import type { InterviewQuestion } from "@/lib/types";

export function InterviewQuestionItem({
  topicId,
  question: q,
  index,
}: {
  topicId: string;
  question: InterviewQuestion;
  index: number;
}) {
  const s = useStudyNote();

  if (s.editQ === q.id) {
    return (
      <div className="rounded-edit border border-field bg-surface p-16">
        <div className={LABEL_MINI}>질문</div>
        <AutoGrowTextarea
          value={s.qDraft.t}
          onChange={(e) => s.setQDraft({ t: e.target.value })}
          placeholder="질문을 적는다."
          className="mb-12 min-h-42 w-full resize-none overflow-hidden rounded-input border border-field bg-white px-12 py-10 text-145 leading-input font-semibold tracking-name text-ink outline-none focus:border-accent"
        />
        <div className={LABEL_MINI}>핵심 키워드, 쉼표로 구분한다</div>
        <input
          value={s.qDraft.k}
          onChange={(e) => s.setQDraft({ k: e.target.value })}
          placeholder="프록시, 트랜잭션, 롤백"
          className="mb-12 w-full rounded-input border border-field bg-white px-12 py-9 text-135 text-body outline-none focus:border-accent"
        />
        <div className={LABEL_MINI}>답변</div>
        <textarea
          value={s.qDraft.a}
          onChange={(e) => s.setQDraft({ a: e.target.value })}
          placeholder="답변을 적는다."
          className="h-170 w-full resize-y rounded-btn border border-field bg-white p-13 text-14 leading-answer text-body outline-none focus:border-accent"
        />
        <div className="mt-12 flex items-center gap-6">
          <button
            type="button"
            onClick={() => s.saveQuestion(topicId, q.id)}
            className="rounded-input bg-accent px-15 py-9 text-13 font-semibold text-white hover:bg-accent-hover"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => s.cancelQuestion(topicId, q.id)}
            className="rounded-input border border-field bg-white px-15 py-9 text-13 font-medium text-body hover:bg-chip"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => s.removeQuestion(topicId, q.id)}
            className="ml-auto px-12 py-11 text-125 font-medium text-muted hover:text-rejected"
          >
            삭제
          </button>
        </div>
      </div>
    );
  }

  const open = !s.closed[q.id];

  return (
    <div className="flex items-start gap-12">
      <span className="pt-3 text-12 font-semibold text-numeral tabular-nums">{ordinal(index)}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-9 text-15 leading-question font-semibold tracking-question text-pretty">
          {q.t}
        </div>
        <div className="flex flex-wrap gap-6">
          {q.k.map((k) => (
            <span
              key={k}
              className="rounded-chip bg-chip px-9 py-5 text-12 font-medium text-body"
            >
              {k}
            </span>
          ))}
        </div>
        {open && <p className="mt-12 mb-0 text-14 leading-answer text-body text-pretty">{q.a}</p>}
        <button
          type="button"
          onClick={() => s.toggleAnswer(q.id, open)}
          className="mt-12 rounded-input border border-accent-border bg-white px-13 py-10 text-125 font-semibold text-accent hover:text-link-hover"
        >
          {open ? "답변 접기" : "답변 보기"}
        </button>
      </div>
      <div className="flex flex-none gap-10">
        <button
          type="button"
          onClick={() => s.startEditQuestion(q.id, { t: q.t, k: q.k.join(", "), a: q.a })}
          className={`${BTN_ROW_TEXT} text-muted hover:text-ink`}
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => s.removeQuestion(topicId, q.id)}
          className={`${BTN_ROW_TEXT} text-muted hover:text-rejected`}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
