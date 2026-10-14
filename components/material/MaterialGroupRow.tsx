"use client";

import { BTN_CANCEL, BTN_ROW_TEXT, BTN_SAVE, INPUT_PANEL } from "../ui/classes";
import { useStudyNote } from "@/lib/store";
import type { MaterialGroup } from "@/lib/types";

/** 컨셉 행 하나 — 보통 / 선택됨 / 편집 중. 면접 준비의 TopicRow와 같은 모양이다. */
export function MaterialGroupRow({ group: t, picked }: { group: MaterialGroup; picked: boolean }) {
  const s = useStudyNote();

  if (s.editGroup === t.id) {
    return (
      <div className="flex flex-col gap-6 bg-surface px-13 py-12">
        <input
          value={s.groupDraft}
          onChange={(e) => s.setGroupDraft(e.target.value)}
          placeholder="컨셉 이름"
          className={`${INPUT_PANEL} text-135 font-semibold`}
        />
        <div className="flex gap-6">
          <button type="button" onClick={() => s.saveGroup(t.id)} className={BTN_SAVE}>
            저장
          </button>
          <button type="button" onClick={s.cancelEditGroup} className={BTN_CANCEL}>
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        picked
          ? "relative flex items-center gap-8 bg-accent-bg p-13 shadow-[inset_3px_0_0_var(--color-accent)]"
          : "relative flex items-center gap-8 p-13 hover:bg-surface"
      }
    >
      {/* 행의 여백을 눌러도 선택되도록 선택 버튼의 ::after가 행 전체(relative)를 덮는다.
          수정·삭제는 relative로 그 위에 올려 따로 눌린다. */}
      <button
        type="button"
        onClick={() => s.selectGroup(t.id)}
        className="flex min-w-0 flex-1 items-center gap-7 p-0 text-left after:absolute after:inset-0"
      >
        <span
          className={
            picked
              ? "min-w-0 flex-1 text-135 font-bold tracking-name text-picked-title"
              : "min-w-0 flex-1 text-135 font-semibold tracking-name"
          }
        >
          {t.name}
        </span>
        <span
          className={
            picked
              ? "text-12 font-semibold whitespace-nowrap text-picked-sub tabular-nums"
              : "text-12 whitespace-nowrap text-muted tabular-nums"
          }
        >
          {t.items.length}개
        </span>
      </button>
      <div className="relative flex flex-none gap-10">
        <button
          type="button"
          onClick={() => s.startEditGroup(t)}
          className={`${BTN_ROW_TEXT} ${picked ? "text-picked-sub" : "text-muted"} hover:text-ink`}
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => s.removeGroup(t)}
          className={`${BTN_ROW_TEXT} ${picked ? "text-picked-sub" : "text-muted"} hover:text-rejected`}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
