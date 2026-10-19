"use client";

import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { useStudyNote } from "@/lib/store";
import type { ProfileSection } from "@/lib/types";

/** 공채 지원서처럼 왼쪽에 항목 이름, 가운데 값, 오른쪽에 비고. 좁은 화면에서는 위아래로 쌓는다. */
const GRID = "grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)_200px_44px]";

const CELL_INPUT = "w-full resize-none overflow-hidden bg-transparent outline-none";

/**
 * 항목형 섹션. 항목 이름 · 값 · 비고 셋 다 바로 고치고 바로 저장한다.
 * 값이 빈 칸은 "미기록"이 빨갛게 보인다 — 지원서를 채우다 못 넣은 칸을 여기 빈 항목으로 더해 둔다.
 */
export function ProfileFields({ sec }: { sec: ProfileSection }) {
  const s = useStudyNote();

  return (
    <div>
      <div className="overflow-hidden rounded-card border border-line">
        <div className={`${GRID} hidden border-b border-line bg-surface text-12 font-semibold text-muted md:grid`}>
          <div className="px-14 py-9">항목</div>
          <div className="border-l border-line px-14 py-9">값</div>
          <div className="border-l border-line px-14 py-9">비고</div>
          <div />
        </div>
        {sec.fields.map((f) => (
          <div key={f.id} className={`${GRID} border-t border-divider first:border-t-0 md:first:border-t-0`}>
            <div className="bg-surface px-14 py-10 focus-within:bg-white">
              <AutoGrowTextarea
                value={f.label}
                onChange={(e) => s.setProfileField(sec.id, f.id, { label: e.target.value.replace(/\n/g, "") })}
                placeholder="항목 이름"
                aria-label="항목 이름"
                className={`${CELL_INPUT} text-13 leading-input font-semibold text-ink placeholder:text-numeral`}
              />
            </div>
            <div className="px-14 py-10 md:border-l md:border-line">
              <AutoGrowTextarea
                value={f.value}
                onChange={(e) => s.setProfileField(sec.id, f.id, { value: e.target.value })}
                placeholder="미기록"
                aria-label={`${f.label} 값`}
                className={`${CELL_INPUT} text-135 leading-input text-ink placeholder:text-rejected`}
              />
            </div>
            <div className="px-14 pb-10 md:border-l md:border-line md:pt-10">
              <AutoGrowTextarea
                value={f.note}
                onChange={(e) => s.setProfileField(sec.id, f.id, { note: e.target.value })}
                placeholder="비고"
                aria-label={`${f.label} 비고`}
                className={`${CELL_INPUT} text-125 leading-input text-muted placeholder:text-numeral`}
              />
            </div>
            <div className="flex items-start justify-end px-4 md:justify-center">
              <button
                type="button"
                onClick={() => s.removeProfileField(sec.id, f)}
                aria-label={`${f.label} 항목 삭제`}
                className="px-8 py-10 text-12 font-medium text-muted hover:text-rejected"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {sec.fields.length === 0 && (
          <div className="px-20 py-40 text-center text-135 text-muted">이 섹션에는 아직 항목이 없다.</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => s.addProfileField(sec.id)}
        className="mt-10 rounded-mini border border-field bg-white px-12 py-9 text-12 font-semibold text-body hover:bg-hover"
      >
        + 항목 추가
      </button>
    </div>
  );
}
