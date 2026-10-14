"use client";

import { BTN_ROW_TEXT } from "../ui/classes";
import { DdayBadge } from "../ui/DdayBadge";
import { dday, dueText, isSoon } from "@/lib/date";
import { useStudyNote } from "@/lib/store";
import type { JobPosting } from "@/lib/types";

/**
 * 공고 목록의 한 줄. 회사 행(CompanyRow)과 같은 모양·같은 토큰을 쓴다.
 * 다른 점은 마감일이 없는 공고("채용시")가 흔하다는 것이다 — 그럴 때는
 * 날짜 자리와 D-day 배지를 아예 비우고 원문 문구만 보여준다.
 */
export function JobRow({ job, picked }: { job: JobPosting; picked: boolean }) {
  const s = useStudyNote();
  const soon = isSoon(job.due);

  return (
    <div
      className={
        picked
          ? "relative flex items-start gap-8 bg-accent-bg px-13 py-12 shadow-[inset_3px_0_0_var(--color-accent)]"
          : "relative flex items-start gap-8 px-13 py-12 hover:bg-surface"
      }
    >
      {/* 행의 여백을 눌러도 선택되도록 선택 버튼의 ::after가 행 전체(relative)를 덮는다.
          삭제는 relative로 그 위에 올려 따로 눌린다. */}
      <button type="button" onClick={() => s.selectJob(job.id)} className="min-w-0 flex-1 p-0 text-left after:absolute after:inset-0">
        <div
          className={
            picked
              ? "text-135 font-bold tracking-name text-picked-title"
              : "text-135 font-semibold tracking-name"
          }
        >
          {job.company || "회사명 없음"}
        </div>
        <div
          className={
            picked ? "mt-3 text-12 text-picked-sub text-pretty" : "mt-3 text-12 text-muted text-pretty"
          }
        >
          {job.title}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          {job.due ? (
            <>
              <span
                className={
                  picked
                    ? "text-125 font-bold text-picked-title tabular-nums"
                    : "text-125 font-semibold text-ink tabular-nums"
                }
              >
                {dueText(job.due)}
              </span>
              <DdayBadge text={dday(job.due)} soon={soon} variant={picked ? "rowPicked" : "row"} />
            </>
          ) : (
            <span className={picked ? "text-125 text-picked-sub" : "text-125 text-muted"}>
              {job.dueText || "마감일 미정"}
            </span>
          )}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-6">
          <span className={picked ? "text-115 text-picked-sub" : "text-115 text-muted"}>
            {[job.location, job.career].filter(Boolean).join(" · ")}
          </span>
        </div>
      </button>
      {/* 대기 중인 공고만 목록에서 바로 뺀다. 옮김·지움은 상세의 되돌리기로 다룬다. */}
      {!job.picked && !job.deleted && (
        <button
          type="button"
          onClick={() => s.removeJob(job)}
          className={`relative ${BTN_ROW_TEXT} ${picked ? "text-picked-sub" : "text-muted"} hover:text-rejected`}
        >
          삭제
        </button>
      )}
    </div>
  );
}
