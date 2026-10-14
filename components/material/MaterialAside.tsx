"use client";

import { MaterialGroupRow } from "./MaterialGroupRow";
import { BTN_ADD, LIST_CARD } from "../ui/classes";
import { FINAL_GROUP, useStudyNote } from "@/lib/store";
import { downloadMaterials } from "@/lib/material-md";

/** 재료의 컨셉 목록. 면접 준비의 주제 목록과 같은 모양이다. 맨 위에 "최종" 모아 보기가 있다. */
export function MaterialAside() {
  const s = useStudyNote();
  const finalCount = s.materialGroups.reduce((n, g) => n + g.items.filter((m) => m.final).length, 0);
  const finalPicked = s.groupId === FINAL_GROUP;

  return (
    <div>
      <div className="mb-8 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">컨셉 {s.materialGroups.length}개</span>
        <div className="ml-auto flex gap-6">
          <button
            type="button"
            onClick={() => downloadMaterials(s.materialGroups)}
            className={BTN_ADD}
          >
            .md 내려받기
          </button>
          <button type="button" onClick={s.addGroup} className={BTN_ADD}>
            + 추가
          </button>
        </div>
      </div>
      {/* 컨셉 행과 같은 모양이다. 수정·삭제가 없어서 행 전체가 버튼이다. */}
      <div className={`${LIST_CARD} mb-12`}>
        <button
          type="button"
          onClick={() => s.selectGroup(FINAL_GROUP)}
          className={
            finalPicked
              ? "flex w-full items-center gap-7 bg-accent-bg p-13 text-left shadow-[inset_3px_0_0_var(--color-accent)]"
              : "flex w-full items-center gap-7 p-13 text-left hover:bg-surface"
          }
        >
          <span
            className={
              finalPicked
                ? "min-w-0 flex-1 text-135 font-bold tracking-name text-picked-title"
                : "min-w-0 flex-1 text-135 font-semibold tracking-name"
            }
          >
            최종
          </span>
          <span
            className={
              finalPicked
                ? "text-12 font-semibold whitespace-nowrap text-picked-sub tabular-nums"
                : "text-12 whitespace-nowrap text-muted tabular-nums"
            }
          >
            {finalCount}개
          </span>
        </button>
      </div>
      <div className={LIST_CARD}>
        {s.materialGroups.map((g) => (
          <div key={g.id} className="border-t border-divider">
            <MaterialGroupRow group={g} picked={g.id === s.groupId} />
          </div>
        ))}
        {s.materialGroups.length === 0 && (
          <div className="border-t border-divider px-14 py-22 text-center text-125 text-muted">
            갈등 상황, 기술 답변처럼 큰 컨셉부터 만든다.
          </div>
        )}
      </div>
    </div>
  );
}
