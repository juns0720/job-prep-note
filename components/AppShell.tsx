"use client";

import { useState } from "react";
import { CalendarView } from "./calendar/CalendarView";
import { CoverAside } from "./cover/CoverAside";
import { CoverDetail } from "./cover/CoverDetail";
import { InterviewAside } from "./interview/InterviewAside";
import { InterviewDetail } from "./interview/InterviewDetail";
import { JobAside } from "./job/JobAside";
import { JobDetail } from "./job/JobDetail";
import { MaterialAside } from "./material/MaterialAside";
import { MaterialDetail } from "./material/MaterialDetail";
import { ProjectList } from "./project/ProjectList";
import { BTN_CANCEL, BTN_SAVE } from "./ui/classes";
import { useStudyNote } from "@/lib/store";

export function AppShell({ userEmail }: { userEmail: string }) {
  const s = useStudyNote();

  // 좁은 화면에서는 목록과 상세 중 하나만 보인다.
  const asideVisible = !s.narrow || !s.detail;
  const mainVisible = !s.narrow || s.detail;

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-line bg-[rgba(255,255,255,0.94)] backdrop-blur-[8px]">
        <div className="mx-auto flex min-h-58 max-w-1160 flex-wrap items-center gap-20 px-20">
          <div className="flex items-baseline gap-8 py-10">
            <span className="text-16 font-bold tracking-logo">study·note</span>
          </div>
          {/* 좁은 화면에서는 탭이 한 줄에 다 안 들어간다. 글자가 꺾이지 않게 탭째로 다음 줄로 넘긴다. */}
          <nav className="ml-auto flex flex-wrap gap-2 pb-2">
            <Tab label="자기소개서" active={s.tab === "cover"} onClick={s.goCover} />
            <Tab label="재료" active={s.tab === "material"} onClick={s.goMaterial} />
            <Tab label="프로젝트" active={s.tab === "project"} onClick={s.goProject} />
            <Tab label="면접 준비" active={s.tab === "interview"} onClick={s.goInterview} />
            <Tab label="공고" active={s.tab === "job"} onClick={s.goJobs} />
            <Tab label="캘린더" active={s.tab === "calendar"} onClick={s.goCalendar} />
          </nav>
          {/* 원본 디자인에 없던 요소다 — 로그인을 붙이면서 로그아웃 동선이 필요해 최소한으로 넣었다. */}
          <div className="flex items-center gap-10">
            <SaveControl />
            <span className="hidden text-12 text-muted sm:inline">{userEmail}</span>
            <button type="button" onClick={s.signOut} className="p-10 text-12 font-medium text-muted hover:text-ink">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-1160 px-20 pt-24 pb-90">
        {/* 프로젝트는 몇 개 안 돼서 목록·상세로 나누지 않고 한 칸에 세로로 다 보여준다. */}
        {s.tab === "project" ? (
          <ProjectList />
        ) : s.tab === "calendar" ? (
          // 캘린더는 달력 하나라 목록·상세로 나누지 않는다.
          <CalendarView />
        ) : (
          <div className="flex flex-wrap items-start gap-22">
            {/* 자소서 탭은 반대로 상세(답변)가 길다. 답변을 써 내려가도 목록이 따라오게 붙여두고,
                목록이 화면보다 길면 제 칸 안에서 따로 스크롤한다. */}
            {asideVisible && (
              <aside
                className={
                  s.tab === "cover"
                    ? "min-w-0 flex-[1_1_260px] lg:sticky lg:top-78 lg:max-h-[calc(100dvh-102px)] lg:overflow-y-auto lg:overscroll-contain"
                    : "min-w-0 flex-[1_1_260px]"
                }
              >
                {s.tab === "cover" ? (
                  <CoverAside />
                ) : s.tab === "material" ? (
                  <MaterialAside />
                ) : s.tab === "interview" ? (
                  <InterviewAside />
                ) : (
                  <JobAside />
                )}
              </aside>
            )}
            {/* 공고 탭은 목록이 길고 상세가 짧다. 목록을 훑어 내려도 상세가 따라오게 붙여둔다.
                헤더(58px)에 가리지 않도록 그만큼 내려서 멈춘다. 상세가 길면 JobDetail이
                제 칸 안에서 따로 스크롤한다. */}
            {mainVisible && (
              <section
                className={
                  s.tab === "job" ? "min-w-0 flex-[3_1_520px] lg:sticky lg:top-78" : "min-w-0 flex-[3_1_520px]"
                }
              >
                {s.tab === "cover" ? (
                  <CoverDetail />
                ) : s.tab === "material" ? (
                  <MaterialDetail />
                ) : s.tab === "interview" ? (
                  <InterviewDetail />
                ) : (
                  <JobDetail />
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="relative rounded-input px-14 py-12 text-14 whitespace-nowrap hover:bg-chip">
      {active ? (
        <>
          <span className="absolute inset-0 rounded-input bg-divider" />
          <span className="relative font-semibold text-ink">{label}</span>
        </>
      ) : (
        <span className="relative font-medium text-muted">{label}</span>
      )}
    </button>
  );
}

/**
 * 저장 상태와 [저장] 버튼. 번들에 없던 요소다 — 저장이 실패해도 화면에 아무 표시가 없어서,
 * 쓴 것이 사라진 뒤에야 알게 됐다. 쓰는 대로 저장하므로 버튼은 실패했을 때 바로 다시 보내는 용도다.
 * 실패한 동안에는 버튼을 주 버튼 모양으로 바꿔 눈에 띄게 한다.
 */
function SaveControl() {
  const s = useStudyNote();
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    setBusy(true);
    const ok = await s.saveNow();
    setBusy(false);
    if (!ok) window.alert("저장하지 못했다. 인터넷 연결과 로그인 상태를 확인하고 다시 저장을 눌러 줘.");
  };

  return (
    <div className="flex items-center gap-8">
      <span className={`text-12 font-medium ${s.saveState === "failed" ? "text-rejected" : "text-muted"}`}>
        {s.saveState === "failed" ? "저장 실패" : s.saveState === "saving" ? "저장 중" : "저장됨"}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className={s.saveState === "failed" ? BTN_SAVE : BTN_CANCEL}
      >
        저장
      </button>
    </div>
  );
}
