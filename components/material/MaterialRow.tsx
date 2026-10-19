"use client";

import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { useStudyNote } from "@/lib/store";
import { charLength, ordinal } from "@/lib/text";
import type { Material } from "@/lib/types";

/**
 * 재료 문항 한 줄 — 최종 체크, 접기, 한 줄 주제, 글자 수, ↑↓, 삭제 + 펼치면 내용.
 * 컨셉 화면과 "최종" 화면이 같이 쓴다. 최종 화면은 여러 컨셉을 섞어 보여주므로
 * 순서를 바꾸지 않는다(move를 넘기지 않는다).
 */
export function MaterialRow({
  groupId,
  m,
  index,
  open,
  onToggle,
  move,
}: {
  groupId: string;
  m: Material;
  index: number;
  open: boolean;
  onToggle: () => void;
  move?: { first: boolean; last: boolean };
}) {
  const s = useStudyNote();

  return (
    <div className="border-b border-divider px-2 py-12">
      <div className="flex items-start gap-10">
        {/* 실제로 쓸 문항이면 체크한다. 체크한 것은 왼쪽 목록의 "최종"에 모인다. */}
        <button
          type="button"
          onClick={() => s.setMaterial(groupId, m.id, { final: !m.final })}
          aria-label={m.final ? "최종에서 빼기" : "최종으로 체크"}
          aria-pressed={m.final}
          className="flex-none pt-12"
        >
          <span
            className={
              m.final
                ? "flex h-17 w-17 items-center justify-center rounded-badge border border-accent bg-accent text-11 font-bold text-white hover:bg-accent-hover"
                : "flex h-17 w-17 items-center justify-center rounded-badge border border-field bg-white text-11 font-bold text-white hover:bg-hover"
            }
          >
            ✓
          </span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "내용 접기" : "내용 펼치기"}
          className="flex items-center gap-6 pt-11 text-12 font-semibold text-numeral tabular-nums hover:text-ink"
        >
          <span className="text-muted">{open ? "▾" : "▸"}</span>
          {ordinal(index)}
        </button>
        {/* 주제를 안 적었으면 내용 첫 줄을 흐리게 대신 보여준다. */}
        <input
          value={m.title}
          onChange={(e) => s.setMaterial(groupId, m.id, { title: e.target.value })}
          placeholder={m.t.split("\n")[0] || "한 줄 주제"}
          className="min-w-0 flex-1 rounded-input border border-transparent bg-surface px-10 py-9 text-145 leading-input font-semibold tracking-name text-ink outline-none focus:border-accent focus:bg-white"
        />
        {/* 내용의 글자 수. 접어 둬도 얼마나 썼는지 보인다. */}
        <span className="pt-11 text-125 whitespace-nowrap text-muted tabular-nums">{charLength(m.t)}자</span>
        {/* 맨 위·맨 아래에서는 자리를 지키도록 숨기기만 한다. */}
        {move && (
          <div className="flex flex-none">
            <button
              type="button"
              onClick={() => s.moveMaterial(groupId, m.id, -1)}
              aria-label="위로"
              className={`mt-4 px-6 py-10 text-12 font-medium text-muted hover:text-ink${move.first ? " invisible" : ""}`}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => s.moveMaterial(groupId, m.id, 1)}
              aria-label="아래로"
              className={`mt-4 px-6 py-10 text-12 font-medium text-muted hover:text-ink${move.last ? " invisible" : ""}`}
            >
              ↓
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => s.removeMaterial(groupId, m.id)}
          className="mt-4 px-8 py-10 text-12 font-medium text-muted hover:text-rejected"
        >
          삭제
        </button>
      </div>
      {open && (
        <AutoGrowTextarea
          value={m.t}
          onChange={(e) => s.setMaterial(groupId, m.id, { t: e.target.value })}
          placeholder="경험이나 답변에 쓸 내용"
          className="mt-8 min-h-88 w-full resize-none overflow-hidden rounded-btn border border-line px-13 py-11 text-14 leading-answer text-body outline-none focus:border-accent"
        />
      )}
    </div>
  );
}
