"use client";

import { CompanyRow } from "./CompanyRow";
import { ProfileLinks } from "./ProfileLinks";
import { BTN_ADD, BTN_CANCEL, BTN_SAVE, INPUT_PANEL, LABEL_MINI, LIST_CARD } from "../ui/classes";
import { SortButton, ViewButton } from "../ui/ListToggle";
import { isSubmitted } from "@/lib/status";
import { useStudyNote, type CoverSort } from "@/lib/store";
import type { Company, CompanyStatus } from "@/lib/types";

export function CoverAside() {
  const s = useStudyNote();

  const inPeriod = s.companies.filter((c) => c.period === s.period);
  const co = inPeriod.find((c) => c.id === s.coverId) ?? inPeriod[0] ?? null;

  // 제출한 회사는 지원 완료 목록으로 따로 뺀다. 답을 다 썼는지가 아니라 진행 상태로 나눈다.
  const writing = inPeriod.filter((c) => !isSubmitted(c));
  const applied = inPeriod.filter(isSubmitted);
  const visible = sortCompanies(s.coverView === "applied" ? applied : writing, s.coverSort);

  // 회사가 남아 있는 시기, 시기가 하나뿐일 때는 삭제를 막는다.
  const periodDeletable = s.pMode === "edit" && inPeriod.length === 0 && s.periodList.length > 1;
  const periodLocked = s.pMode === "edit" && (inPeriod.length > 0 || s.periodList.length <= 1);

  // 다른 시기가 이미 쓰는 이름으로는 바꿀 수 없다(store의 savePeriod가 막는다).
  // 저장을 눌러도 아무 일이 없으면 이유를 알 수 없으니 같은 자리에 안내를 둔다.
  const pDraftName = s.pDraft.trim();
  const periodDuplicate =
    s.pMode === "edit" &&
    pDraftName !== "" &&
    pDraftName !== s.period &&
    s.periodList.includes(pDraftName);

  return (
    <div>
      <ProfileLinks />

      <div className="mb-7 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">지원 시기</span>
        <div className="ml-auto flex gap-10">
          <button
            type="button"
            onClick={s.startEditPeriod}
            className="p-10 text-12 font-medium text-muted hover:text-ink"
          >
            수정
          </button>
          <button
            type="button"
            onClick={s.startAddPeriod}
            className="p-10 text-12 font-semibold text-accent hover:text-link-hover"
          >
            + 추가
          </button>
        </div>
      </div>

      <div className="mb-16">
        {s.pMode === null && (
          <select
            value={s.period}
            onChange={(e) => s.setPeriod(e.target.value)}
            className="w-full rounded-btn border border-field bg-white px-11 py-9 text-14 font-medium text-ink"
          >
            {s.periodList.map((p) => (
              <option key={p} value={p}>
                {`${p} (${s.companies.filter((c) => c.period === p).length})`}
              </option>
            ))}
          </select>
        )}

        {s.pMode === "edit" && (
          <div className="rounded-panel border border-field bg-surface p-12">
            <div className={LABEL_MINI}>시기 이름 고치기</div>
            <input
              value={s.pDraft}
              onChange={(e) => s.setPDraft(e.target.value)}
              placeholder="2026 하반기"
              className={`${INPUT_PANEL} text-135 font-semibold`}
            />
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <button type="button" onClick={s.savePeriod} className={BTN_SAVE}>
                저장
              </button>
              <button type="button" onClick={s.cancelPeriod} className={BTN_CANCEL}>
                취소
              </button>
              {periodDuplicate ? (
                <span className="ml-auto text-115 text-muted">같은 이름의 시기가 이미 있다</span>
              ) : periodDeletable ? (
                <button
                  type="button"
                  onClick={s.removePeriod}
                  className="ml-auto px-12 py-10 text-12 font-medium text-muted hover:text-rejected"
                >
                  삭제
                </button>
              ) : periodLocked ? (
                <span className="ml-auto text-115 text-muted">
                  등록된 회사 {inPeriod.length}곳이 있어 삭제할 수 없다
                </span>
              ) : null}
            </div>
          </div>
        )}

        {s.pMode === "add" && (
          <div className="rounded-panel border border-field bg-surface p-12">
            <div className={LABEL_MINI}>새 시기</div>
            <input
              value={s.pDraft}
              onChange={(e) => s.setPDraft(e.target.value)}
              placeholder="2027 상반기"
              className={`${INPUT_PANEL} text-135 font-semibold`}
            />
            <div className="mt-8 flex gap-6">
              <button type="button" onClick={s.savePeriod} className={BTN_SAVE}>
                추가
              </button>
              <button type="button" onClick={s.cancelPeriod} className={BTN_CANCEL}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">지원한 회사 {inPeriod.length}곳</span>
        <button type="button" onClick={s.addCompany} className={BTN_ADD}>
          + 추가
        </button>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-2">
        <ViewButton
          label="작성 중"
          count={writing.length}
          active={s.coverView === "writing"}
          onClick={() => s.setCoverView("writing")}
        />
        <ViewButton
          label="지원 완료"
          count={applied.length}
          active={s.coverView === "applied"}
          onClick={() => s.setCoverView("applied")}
        />
        <div className="ml-auto flex gap-2">
          <SortButton label="마감순" active={s.coverSort === "due"} onClick={() => s.setCoverSort("due")} />
          <SortButton label="최신순" active={s.coverSort === "created"} onClick={() => s.setCoverSort("created")} />
        </div>
      </div>

      <div className={LIST_CARD}>
        {visible.map((c) => (
          <div key={c.id} className="border-t border-divider">
            <CompanyRow company={c} picked={!!co && c.id === co.id} />
          </div>
        ))}
        {visible.length === 0 && (
          <div className="border-t border-divider px-14 py-22 text-center text-125 text-muted">
            {inPeriod.length === 0
              ? "이 시기에 등록한 회사가 없다."
              : s.coverView === "applied"
                ? "아직 지원을 완료한 회사가 없다."
                : "작성 중인 자기소개서가 없다."}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 진행 상태를 먼저 본다. 전형이 멀리 간 회사일수록 위로, 탈락은 맨 아래로.
 * 상태가 같으면 마감순은 급한 것부터(마감일이 없는 회사는 뒤로), 최신순은 최근에 추가한 회사부터.
 */
function sortCompanies(list: Company[], sort: CoverSort): Company[] {
  return [...list].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
    if (!a.due && !b.due) return b.createdAt.localeCompare(a.createdAt);
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });
}

/** 목록에서 위에 올 순서. 작은 값이 위다. */
const STATUS_RANK: Record<CompanyStatus, number> = {
  writing: 0,
  draft: 1,
  passed: 2,
  interview: 3,
  aptitude: 4,
  assignment: 5,
  coding_test: 6,
  docs_passed: 7,
  applied: 8,
  rejected: 9,
};
