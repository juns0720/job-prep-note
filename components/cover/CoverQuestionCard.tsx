"use client";

import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { useStudyNote } from "@/lib/store";
import { charLength, ordinal } from "@/lib/text";
import type { CoverQuestion } from "@/lib/types";

export function CoverQuestionCard({
  companyId,
  question: q,
  index,
}: {
  companyId: string;
  question: CoverQuestion;
  index: number;
}) {
  const s = useStudyNote();

  const count = charLength(q.a);
  const over = count > q.limit;
  // 진행 바는 min(100, count / limit * 100).
  const pct = q.limit ? Math.min(100, Math.round((count / q.limit) * 100)) : 0;

  return (
    <div className="mb-14 rounded-card border border-line px-20 py-18">
      <div className="mb-12 flex items-start gap-10">
        <span className="pt-11 text-12 font-semibold text-numeral tabular-nums">{ordinal(index)}</span>
        <AutoGrowTextarea
          value={q.t}
          onChange={(e) => s.setCoverQuestion(companyId, q.id, { t: e.target.value })}
          placeholder="자소서 문항"
          className="min-h-40 min-w-0 flex-1 resize-none overflow-hidden rounded-input border border-transparent bg-surface px-10 py-9 text-145 leading-input font-semibold tracking-name text-ink outline-none focus:border-accent focus:bg-white"
        />
        <div className="flex items-center gap-4 pt-10">
          <input
            value={q.limit === 0 ? "" : String(q.limit)}
            onChange={(e) => {
              // 제한 글자 수 입력은 숫자 이외를 지운다.
              const digits = e.target.value.replace(/[^0-9]/g, "");
              s.setCoverQuestion(companyId, q.id, { limit: digits === "" ? 0 : Number(digits) });
            }}
            className="w-62 rounded-mini border border-line px-8 py-6 text-right text-125 text-body outline-none tabular-nums focus:border-accent"
          />
          <span className="text-12 text-muted">자</span>
        </div>
        <button
          type="button"
          onClick={() => s.removeCoverQuestion(companyId, q.id)}
          className="mt-4 px-8 py-10 text-12 font-medium text-muted hover:text-rejected"
        >
          삭제
        </button>
      </div>

      {/* 1000자짜리 답변은 190px 칸에 다 들어가지 않아 안에서 스크롤이 생겼다. 쓴 만큼
          늘어나게 두고, 190px은 비어 있을 때의 최소 높이로만 남긴다. */}
      <AutoGrowTextarea
        value={q.a}
        onChange={(e) => s.setCoverQuestion(companyId, q.id, { a: e.target.value })}
        placeholder="문항에 대한 답변"
        className="min-h-190 w-full resize-none overflow-hidden rounded-btn border border-line p-14 text-14 leading-answer text-body outline-none focus:border-accent"
      />

      <div className="mt-10 flex items-center gap-10">
        <div className="h-5 flex-1 overflow-hidden rounded-bar bg-track">
          <div className="h-full rounded-bar bg-accent" style={{ width: `${pct}%` }} />
        </div>
        {over ? (
          <span className="text-125 font-semibold whitespace-nowrap text-rejected tabular-nums">
            {count} / {q.limit}자 · {count - q.limit}자 초과
          </span>
        ) : (
          <span className="text-125 whitespace-nowrap text-muted tabular-nums">
            {count} / {q.limit}자
          </span>
        )}
      </div>
    </div>
  );
}
