"use client";

import { useState } from "react";
import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { BTN_CANCEL, INPUT_PANEL, LABEL_MINI } from "../ui/classes";
import { useStudyNote } from "@/lib/store";
import { charLength, newId, ordinal } from "@/lib/text";
import type { ProfileColumn, ProfileSection } from "@/lib/types";

const BTN_SMALL = "rounded-mini border border-field bg-white px-12 py-9 text-12 font-semibold text-body hover:bg-hover";

/**
 * 여러 건 섹션(학력, 자격증, 수상 ...). 공채 지원서에서 "+ 추가"로 줄을 늘리는 칸처럼 한 건이
 * 카드 하나다. 칸 이름은 섹션마다 한 벌이고 [칸 편집]에서 더하고 고치고 지운다.
 * 넓은 칸(활동 내역, 상세 내용 같은 긴 글)은 한 줄을 다 쓰고 글자 수를 보여 준다.
 */
export function ProfileEntries({ sec }: { sec: ProfileSection }) {
  const s = useStudyNote();
  // 칸이 하나도 없으면 칸부터 만들어야 해서 편집을 열어 둔다. 화면에만 필요한 상태다.
  const [editing, setEditing] = useState(sec.columns.length === 0);

  const setColumns = (columns: ProfileColumn[]) => s.setSection(sec.id, { columns });
  const setColumn = (id: string, patch: Partial<ProfileColumn>) =>
    setColumns(sec.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeColumn = (c: ProfileColumn) => {
    const filled = sec.entries.filter((e) => (e.cells[c.id] ?? "").trim()).length;
    const ask = filled > 0 ? `${c.name || "이름 없는"} 칸과 거기 적은 값 ${filled}개를 지울까?` : `${c.name || "이름 없는"} 칸을 지울까?`;
    if (!window.confirm(ask)) return;
    setColumns(sec.columns.filter((x) => x.id !== c.id));
  };

  return (
    <div>
      <div className="mb-10 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">칸 {sec.columns.length}개</span>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="ml-auto p-10 text-12 font-medium text-muted hover:text-ink">
            칸 편집
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-14 rounded-panel border border-field bg-surface p-12">
          <div className={LABEL_MINI}>칸 이름을 정하고 넓게 표시할 칸을 선택한다</div>
          <div className="flex flex-col gap-6">
            {sec.columns.map((c) => (
              <div key={c.id} className="flex items-center gap-8">
                <input
                  value={c.name}
                  onChange={(e) => setColumn(c.id, { name: e.target.value })}
                  placeholder="칸 이름"
                  className={`${INPUT_PANEL} min-w-0 flex-1 bg-white text-13`}
                />
                <label className="flex shrink-0 items-center gap-4 text-12 text-muted">
                  <input type="checkbox" checked={c.wide} onChange={(e) => setColumn(c.id, { wide: e.target.checked })} />
                  넓게
                </label>
                <button
                  type="button"
                  onClick={() => removeColumn(c)}
                  className="shrink-0 px-6 py-8 text-12 font-medium text-muted hover:text-rejected"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          <div className="mt-10 flex gap-6">
            <button type="button" onClick={() => setColumns([...sec.columns, { id: newId(), name: "", wide: false }])} className={BTN_SMALL}>
              + 칸 추가
            </button>
            <button type="button" onClick={() => setEditing(false)} className={BTN_CANCEL}>
              닫기
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-12">
        {sec.entries.map((e, i) => {
          const head = sec.columns.map((c) => e.cells[c.id] ?? "").find((v) => v.trim()) ?? "";
          return (
            <div key={e.id} className="overflow-hidden rounded-card border border-line">
              <div className="flex items-center gap-10 border-b border-line bg-surface py-4 pr-6 pl-14">
                <span className="text-12 font-semibold text-numeral tabular-nums">{ordinal(i)}</span>
                <span className="min-w-0 flex-1 truncate text-135 font-semibold tracking-name text-ink">{head}</span>
                <button
                  type="button"
                  onClick={() => s.removeProfileEntry(sec.id, e.id)}
                  className="px-8 py-10 text-12 font-medium text-muted hover:text-rejected"
                >
                  삭제
                </button>
              </div>
              <div className="grid grid-cols-1 gap-x-14 gap-y-12 p-16 sm:grid-cols-2 lg:grid-cols-3">
                {sec.columns.map((c) => {
                  const v = e.cells[c.id] ?? "";
                  return (
                    <div key={c.id} className={c.wide ? "col-span-full" : "min-w-0"}>
                      <div className={`${LABEL_MINI} flex gap-6`}>
                        <span>{c.name || "이름 없는 칸"}</span>
                        {c.wide && <span className="ml-auto font-medium tabular-nums">{charLength(v).toLocaleString()}자</span>}
                      </div>
                      <AutoGrowTextarea
                        value={v}
                        onChange={(ev) => s.setProfileCell(sec.id, e.id, c.id, ev.target.value)}
                        placeholder="미기록"
                        aria-label={c.name}
                        className={
                          c.wide
                            ? "w-full resize-none overflow-hidden rounded-mini border border-line px-10 py-8 text-135 leading-memo text-body outline-none placeholder:text-rejected focus:border-accent"
                            : "w-full resize-none overflow-hidden rounded-mini border border-line px-10 py-8 text-13 leading-input text-ink outline-none placeholder:text-rejected focus:border-accent"
                        }
                      />
                    </div>
                  );
                })}
                {sec.columns.length === 0 && <div className="col-span-full text-125 text-muted">칸 편집에서 기록할 항목을 먼저 추가한다.</div>}
              </div>
            </div>
          );
        })}
        {sec.entries.length === 0 && (
          <div className="rounded-card border border-line px-20 py-40 text-center text-135 text-muted">아직 등록한 내역이 없다.</div>
        )}
      </div>
      <button type="button" onClick={() => s.addProfileEntry(sec.id)} className={`${BTN_SMALL} mt-10`}>
        + 추가
      </button>
    </div>
  );
}
