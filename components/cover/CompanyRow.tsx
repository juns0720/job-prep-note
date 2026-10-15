"use client";

import { BTN_CANCEL, BTN_ROW_TEXT, BTN_SAVE, INPUT_PANEL } from "../ui/classes";
import { DdayBadge } from "../ui/DdayBadge";
import { STATUS_LABEL } from "../ui/StatusBadge";
import { dday, dueText, isSoon } from "@/lib/date";
import { isSubmitted } from "@/lib/status";
import { useStudyNote } from "@/lib/store";
import type { Company } from "@/lib/types";

export function CompanyRow({ company: c, picked }: { company: Company; picked: boolean }) {
  const s = useStudyNote();

  if (s.editCo === c.id) {
    return (
      <div className="flex flex-col gap-7 bg-surface px-13 py-12">
        <input
          value={s.coDraft.name}
          onChange={(e) => s.setCoDraft({ name: e.target.value })}
          placeholder="회사명"
          className={`${INPUT_PANEL} text-135 font-semibold`}
        />
        <input
          value={s.coDraft.role}
          onChange={(e) => s.setCoDraft({ role: e.target.value })}
          placeholder="직무"
          className={`${INPUT_PANEL} text-13`}
        />
        <div>
          <div className="mb-4 text-115 font-semibold text-muted">마감일</div>
          <input
            type="date"
            value={s.coDraft.due}
            onChange={(e) => s.setCoDraft({ due: e.target.value })}
            className={`${INPUT_PANEL} text-13 text-ink tabular-nums`}
          />
        </div>
        <div className="mt-2 flex gap-6">
          <button type="button" onClick={() => s.saveCompany(c.id)} className={BTN_SAVE}>
            저장
          </button>
          <button type="button" onClick={s.cancelEditCompany} className={BTN_CANCEL}>
            취소
          </button>
        </div>
      </div>
    );
  }

  const soon = isSoon(c.due);
  // 목록에서는 남은 날만 본다. 마감이 지났거나 날짜가 없으면 배지를 달지 않는다
  // (날짜 줄에 이미 "마감일 미정"이 보인다). 제출한 뒤에는 마감이 상관없으니 상태를 대신 단다.
  // 작성 중이면 상태와 D-day를 같이 단다.
  const submitted = isSubmitted(c);
  const ddayText = !submitted && c.due && dday(c.due) !== "마감 지남" ? dday(c.due) : "";

  // 한 번에 많은 회사가 보이도록 행을 두 줄로 줄인다.
  // 회사명 오른쪽에 D-day(또는 진행 상태)를 크게 달고, 행 오른쪽에 마감일, 맨 오른쪽에 수정·삭제를 한 줄로 둔다.
  return (
    <div
      className={
        picked
          ? "relative flex items-center gap-10 bg-accent-bg px-13 py-10 shadow-[inset_3px_0_0_var(--color-accent)]"
          : "relative flex items-center gap-10 px-13 py-10 hover:bg-surface"
      }
    >
      {/* 행의 여백을 눌러도 선택되도록 선택 버튼의 ::after가 행 전체(relative)를 덮는다.
          수정·삭제는 relative로 그 위에 올려 따로 눌린다. */}
      <button
        type="button"
        onClick={() => s.selectCompany(c.id)}
        className="min-w-0 flex-1 p-0 text-left after:absolute after:inset-0"
      >
        <div className="flex min-w-0 items-center gap-8">
          <span
            className={
              picked
                ? "truncate text-135 font-bold tracking-name text-picked-title"
                : "truncate text-135 font-semibold tracking-name"
            }
          >
            {c.name}
          </span>
          {submitted ? (
            <span
              className={`shrink-0 rounded-chip px-8 py-5 text-12 font-semibold whitespace-nowrap ${
                c.status === "rejected"
                  ? picked
                    ? "bg-white text-rejected"
                    : "bg-rejected-bg text-rejected"
                  : picked
                    ? "bg-white text-passed"
                    : "bg-passed-bg text-passed"
              }`}
            >
              {STATUS_LABEL[c.status]}
            </span>
          ) : (
            <>
              {/* 작성 중이면 상태를 달고, 아직 안 냈으니 D-day도 그 옆에 그대로 둔다. */}
              {c.status === "writing" && (
                <span
                  className={`shrink-0 rounded-chip px-8 py-5 text-12 font-semibold whitespace-nowrap ${
                    picked ? "bg-white text-accent" : "bg-accent-bg text-accent"
                  }`}
                >
                  {STATUS_LABEL.writing}
                </span>
              )}
              {ddayText && (
                <span className="flex shrink-0">
                  <DdayBadge text={ddayText} soon={soon} variant={picked ? "namePicked" : "name"} />
                </span>
              )}
            </>
          )}
        </div>
        <div className={picked ? "mt-3 truncate text-12 text-picked-sub" : "mt-3 truncate text-12 text-muted"}>
          {c.role}
        </div>
      </button>
      <span
        className={
          picked
            ? "shrink-0 text-12 font-bold whitespace-nowrap text-picked-title tabular-nums"
            : "shrink-0 text-12 font-semibold whitespace-nowrap text-ink tabular-nums"
        }
      >
        {dueText(c.due)}
      </span>
      <div className="relative flex shrink-0">
        <button
          type="button"
          onClick={() => s.startEditCompany(c)}
          className={`${BTN_ROW_TEXT} px-5 ${picked ? "text-picked-sub" : "text-muted"} hover:text-ink`}
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => s.removeCompany(c)}
          className={`${BTN_ROW_TEXT} px-5 ${picked ? "text-picked-sub" : "text-muted"} hover:text-rejected`}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
