"use client";

import { BTN_ADD, LIST_CARD } from "../ui/classes";
import { emptyCount, sizeLabel } from "@/lib/profile";
import { PROFILE_FILES, useStudyNote } from "@/lib/store";

const ROW = "flex w-full items-center gap-7 p-13 text-left";
const ROW_PICKED = `${ROW} bg-accent-bg shadow-[inset_3px_0_0_var(--color-accent)]`;
const ROW_IDLE = `${ROW} hover:bg-surface`;

/**
 * 인적사항의 섹션 목록. 재료의 컨셉 목록과 같은 모양이고, 맨 위에 첨부 파일·링크가 있다.
 * 섹션 이름은 상세에서 바로 고치고 지우기도 상세에서 하므로 행 전체가 버튼이다.
 * 빈 칸(미기록)이 있으면 빨간 글씨로 수를 보여 준다 — 아직 받아야 할 정보다.
 */
export function ProfileAside() {
  const s = useStudyNote();
  const filesPicked = s.sectionId === PROFILE_FILES;

  return (
    <div>
      <div className="mb-8 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">섹션 {s.profileSections.length}개</span>
        <button type="button" onClick={s.addSection} className={BTN_ADD}>
          + 추가
        </button>
      </div>

      <div className={`${LIST_CARD} mb-12`}>
        <button type="button" onClick={() => s.selectSection(PROFILE_FILES)} className={filesPicked ? ROW_PICKED : ROW_IDLE}>
          <Name picked={filesPicked}>첨부 파일·링크</Name>
          <Count picked={filesPicked}>{s.profileFiles.length}개</Count>
        </button>
      </div>

      <div className={LIST_CARD}>
        {s.profileSections.map((sec) => {
          const picked = sec.id === s.sectionId;
          const empty = emptyCount(sec);
          return (
            <div key={sec.id} className="border-t border-divider first:border-t-0">
              <button type="button" onClick={() => s.selectSection(sec.id)} className={picked ? ROW_PICKED : ROW_IDLE}>
                <Name picked={picked}>{sec.name || "이름 없음"}</Name>
                {empty > 0 && (
                  <span className="text-12 font-semibold whitespace-nowrap text-rejected tabular-nums">빈 칸 {empty}</span>
                )}
                <Count picked={picked}>{sizeLabel(sec)}</Count>
              </button>
            </div>
          );
        })}
        {s.profileSections.length === 0 && (
          <div className="px-14 py-22 text-center text-125 text-muted">기본 인적사항, 학력처럼 지원서의 큰 칸부터 만든다.</div>
        )}
      </div>
    </div>
  );
}

function Name({ picked, children }: { picked: boolean; children: React.ReactNode }) {
  return (
    <span
      className={
        picked
          ? "min-w-0 flex-1 text-135 font-bold tracking-name text-picked-title"
          : "min-w-0 flex-1 text-135 font-semibold tracking-name"
      }
    >
      {children}
    </span>
  );
}

function Count({ picked, children }: { picked: boolean; children: React.ReactNode }) {
  return (
    <span
      className={
        picked
          ? "text-12 font-semibold whitespace-nowrap text-picked-sub tabular-nums"
          : "text-12 whitespace-nowrap text-muted tabular-nums"
      }
    >
      {children}
    </span>
  );
}
