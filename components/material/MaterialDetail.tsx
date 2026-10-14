"use client";

import { useState } from "react";
import { MaterialRow } from "./MaterialRow";
import { BTN_BACK } from "../ui/classes";
import { FINAL_GROUP, useStudyNote } from "@/lib/store";
import { downloadMaterials } from "@/lib/material-md";
import type { Material } from "@/lib/types";

const BTN_TOGGLE_ALL =
  "rounded-input border border-field bg-white px-15 py-12 text-13 font-medium text-body hover:bg-hover";

/**
 * 고른 컨셉 아래의 재료. 하나가 한 줄 주제 + 내용이다.
 * 내용이 길어지면 목록을 내려 보기 어려워서 평소에는 주제만 보이게 접어 둔다.
 * 왼쪽에서 "최종"을 고르면 컨셉을 가로질러 체크한 문항만 컨셉별로 묶어 보여준다.
 */
export function MaterialDetail() {
  const s = useStudyNote();
  // 펼친 것만 기억한다. 화면에만 필요한 상태라 store에 두지 않는다.
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  // 방금 추가해서 아무것도 안 쓴 것은 바로 쓸 수 있게 펼쳐 둔다.
  const isOpen = (m: Material) => opened[m.id] ?? (m.title === "" && m.t === "");
  const toggle = (m: Material) => setOpened((prev) => ({ ...prev, [m.id]: !isOpen(m) }));
  const toggleAll = (items: Material[], anyOpen: boolean) => {
    const next: Record<string, boolean> = {};
    items.forEach((m) => (next[m.id] = !anyOpen));
    setOpened((prev) => ({ ...prev, ...next }));
  };

  const back = s.narrow && (
    <button type="button" onClick={s.backToSide} className={BTN_BACK}>
      ← 컨셉 목록
    </button>
  );

  if (s.groupId === FINAL_GROUP) {
    const groups = s.materialGroups
      .map((g) => ({ ...g, items: g.items.filter((m) => m.final) }))
      .filter((g) => g.items.length > 0);
    const items = groups.flatMap((g) => g.items);
    const anyOpen = items.some(isOpen);

    return (
      <div>
        {back}

        <div className="flex flex-wrap items-end gap-12">
          <div className="min-w-0 flex-[1_1_200px]">
            <h1 className="m-0 text-title font-bold tracking-title">최종</h1>
            <div className="mt-5 text-13 text-muted">문항 {items.length}개</div>
          </div>
          {items.length > 0 && (
            <>
              <button type="button" onClick={() => toggleAll(items, anyOpen)} className={BTN_TOGGLE_ALL}>
                {anyOpen ? "모두 접기" : "모두 펼치기"}
              </button>
              <button type="button" onClick={() => downloadMaterials(groups, "최종")} className={BTN_TOGGLE_ALL}>
                .md 내려받기
              </button>
            </>
          )}
        </div>

        {groups.map((g) => (
          <div key={g.id} className="mt-22">
            <div className="mb-8 text-12 font-semibold text-muted">{g.name || "이름 없음"}</div>
            <div className="border-t border-line">
              {g.items.map((m, i) => (
                <MaterialRow key={m.id} groupId={g.id} m={m} index={i} open={isOpen(m)} onToggle={() => toggle(m)} />
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="mt-18 border-t border-line px-20 py-52 text-center text-135 text-muted">
            컨셉에서 문항 앞 칸을 체크하면 여기 모인다.
          </div>
        )}
      </div>
    );
  }

  const cur = s.materialGroups.find((g) => g.id === s.groupId) ?? s.materialGroups[0] ?? null;

  if (!cur) {
    return (
      <div className="rounded-card border border-dashed border-field px-20 py-56 text-center">
        <div className="mb-14 text-14 text-muted">왼쪽에서 컨셉을 추가하면 그 아래에 문항을 모을 수 있다.</div>
        <button
          type="button"
          onClick={s.addGroup}
          className="rounded-btn bg-accent px-16 py-10 text-14 font-semibold text-white hover:bg-accent-hover"
        >
          컨셉 추가
        </button>
      </div>
    );
  }

  const anyOpen = cur.items.some(isOpen);

  return (
    <div>
      {back}

      <div className="flex flex-wrap items-end gap-12">
        <div className="min-w-0 flex-[1_1_200px]">
          <h1 className="m-0 text-title font-bold tracking-title">{cur.name}</h1>
          <div className="mt-5 text-13 text-muted">문항 {cur.items.length}개</div>
        </div>
        {cur.items.length > 0 && (
          <button type="button" onClick={() => toggleAll(cur.items, anyOpen)} className={BTN_TOGGLE_ALL}>
            {anyOpen ? "모두 접기" : "모두 펼치기"}
          </button>
        )}
        <button
          type="button"
          onClick={() => s.addMaterial(cur.id)}
          className="rounded-btn bg-accent px-16 py-12 text-135 font-semibold text-white hover:bg-accent-hover"
        >
          + 문항 추가
        </button>
      </div>

      <div className="mt-18 border-t border-line">
        {cur.items.map((m, i) => (
          <MaterialRow
            key={m.id}
            groupId={cur.id}
            m={m}
            index={i}
            open={isOpen(m)}
            onToggle={() => toggle(m)}
            move={{ first: i === 0, last: i === cur.items.length - 1 }}
          />
        ))}
        {cur.items.length === 0 && (
          <div className="px-20 py-52 text-center text-135 text-muted">이 컨셉에는 아직 문항이 없다.</div>
        )}
      </div>
    </div>
  );
}
