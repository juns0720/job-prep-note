"use client";

import { JobRow } from "./JobRow";
import { JobRules } from "./JobRules";
import { LIST_CARD } from "../ui/classes";
import { SortButton, ViewButton } from "../ui/ListToggle";
import { useStudyNote, type JobSort, type JobSource, type JobView } from "@/lib/store";
import type { JobPosting } from "@/lib/types";

/**
 * 수집기가 넣어둔 공고 목록. 자기소개서 쪽 목록과 같은 구조다.
 *
 * 공고는 셋 중 하나에 놓인다 — 아직 안 본 것(대기), 자기소개서로 넘긴 것(옮김),
 * 목록에서 뺀 것(지움). 넘기거나 빼면 대기에서 사라지므로 훑어 내려가면
 * 대기가 줄어든다. 옮긴 것과 뺀 것도 언제든 다시 꺼내 볼 수 있다.
 */
export function JobAside() {
  const s = useStudyNote();

  const open = s.jobs.filter((j) => !j.picked && !j.deleted);
  const moved = s.jobs.filter((j) => j.picked && !j.deleted);
  const gone = s.jobs.filter((j) => j.deleted);

  const current = s.jobView === "moved" ? moved : s.jobView === "gone" ? gone : open;
  const sources = sourcesOf(s.jobs);
  const filtered = s.jobSource === "all" ? current : current.filter((j) => j.source === s.jobSource);
  const visible = sortJobs(filtered, s.jobSort);

  return (
    <div>
      <JobRules />

      <div className="mb-7 flex flex-wrap items-center gap-2">
        <ViewButton label="대기" count={open.length} active={s.jobView === "open"} onClick={() => s.setJobView("open")} />
        <ViewButton label="옮김" count={moved.length} active={s.jobView === "moved"} onClick={() => s.setJobView("moved")} />
        <ViewButton label="지움" count={gone.length} active={s.jobView === "gone"} onClick={() => s.setJobView("gone")} />
      </div>

      <div className="mb-7 flex items-center gap-2">
        <SortButton label="마감순" active={s.jobSort === "due"} onClick={() => s.setJobSort("due")} />
        <SortButton label="최신순" active={s.jobSort === "collected"} onClick={() => s.setJobSort("collected")} />
      </div>

      {/* 사이트가 하나뿐이면 거를 것이 없으니 줄을 띄우지 않는다. */}
      {sources.length > 1 && (
        <div className="mb-7 flex flex-wrap items-center gap-2">
          <SortButton label="전체" count={current.length} active={s.jobSource === "all"} onClick={() => s.setJobSource("all")} />
          {sources.map((source) => (
            <SortButton
              key={source}
              label={sourceName(source)}
              count={current.filter((j) => j.source === source).length}
              active={s.jobSource === source}
              onClick={() => s.setJobSource(source)}
            />
          ))}
        </div>
      )}

      <div className={LIST_CARD}>
        {visible.length === 0 ? (
          <div className="px-14 py-22 text-center text-125 text-muted">{emptyText(s.jobView)}</div>
        ) : (
          visible.map((job, i) => (
            <div key={job.id} className={i > 0 ? "border-t border-divider" : ""}>
              <JobRow job={job} picked={job.id === s.jobId} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const SOURCE_NAMES: Record<string, string> = {
  saramin: "사람인",
  jasoseol: "자소설닷컴",
  inthiswork: "인디스워크",
  manual: "직접 모음",
};

/** 수집기 어댑터 순서(sources.json에 적은 순서)대로 둔다. 모르는 사이트는 뒤에 붙인다. */
const SOURCE_ORDER = Object.keys(SOURCE_NAMES);

function sourceName(source: JobSource): string {
  return SOURCE_NAMES[source] ?? source;
}

/**
 * 필터 버튼으로 띄울 사이트들. 보고 있는 칸(대기·옮김·지움)이 아니라 전체 공고에서 뽑는다 —
 * 칸을 바꿀 때마다 버튼이 생겼다 사라지면 고른 필터가 어디 갔는지 헷갈린다.
 */
function sourcesOf(jobs: JobPosting[]): string[] {
  const found = [...new Set(jobs.map((j) => j.source).filter(Boolean))];
  const rank = (s: string) => {
    const i = SOURCE_ORDER.indexOf(s);
    return i === -1 ? SOURCE_ORDER.length : i;
  };
  return found.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function emptyText(view: JobView): string {
  if (view === "moved") return "아직 자기소개서로 옮긴 공고가 없다.";
  if (view === "gone") return "뺀 공고가 없다.";
  return "훑어볼 공고가 없다. 수집기를 돌린다.";
}

/**
 * 마감순은 급한 것부터, 마감일이 없는 공고("채용시")는 맨 뒤로 보낸다.
 * 최신순은 수집한 순서 그대로 — 새로 들어온 공고를 먼저 본다.
 */
function sortJobs(jobs: JobPosting[], sort: JobSort): JobPosting[] {
  const list = [...jobs];
  if (sort === "collected") {
    return list.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  }
  return list.sort((a, b) => {
    if (!a.due && !b.due) return b.collectedAt.localeCompare(a.collectedAt);
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });
}
