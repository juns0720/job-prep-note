"use client";

import { useEffect, useRef } from "react";
import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { BTN_BACK, LABEL_FIELD } from "../ui/classes";
import { DdayBadge } from "../ui/DdayBadge";
import { dday, dueText, isSoon } from "@/lib/date";
import { useStudyNote } from "@/lib/store";
import { ordinal } from "@/lib/text";
import type { CompanyInfo, DutySalary, JobProcess } from "@/lib/types";

/**
 * 공고 하나를 펼쳐 본다. 회사 카드(CoverDetail)와 같은 구조·같은 토큰이다.
 *
 * 공고 내용 자체는 고치지 않는다 — 수집기가 가져온 그대로 두고, 여기서 손대는 것은
 * 내가 남기는 메모뿐이다. 자세한 내용은 회사 채용 페이지에서 본다.
 */
export function JobDetail() {
  const s = useStudyNote();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 왼쪽에서 보고 있는 묶음(대기·옮김·지움) 안에서 고른다.
  const inView = s.jobs.filter((j) =>
    s.jobView === "moved" ? j.picked && !j.deleted : s.jobView === "gone" ? j.deleted : !j.picked && !j.deleted,
  );
  const job = inView.find((j) => j.id === s.jobId) ?? inView[0] ?? null;

  // 다른 공고를 고르면 상세를 맨 위부터 보여준다.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [job?.id]);

  if (!job) {
    return (
      <div className="rounded-card border border-dashed border-field px-20 py-56 text-center">
        <div className="text-14 text-muted">
          {s.jobView === "moved"
            ? "자기소개서에 추가한 공고를 확인할 수 있다."
            : s.jobView === "gone"
              ? "삭제한 공고를 확인하고 대기 목록으로 되돌릴 수 있다."
              : "검토할 공고가 없다. AI에게 공고를 수집해 앱에 넣어 달라고 요청한다."}
        </div>
        {s.jobView === "open" && <div className="mt-7 text-125 text-muted">수집 방법은 README의 공고 수집 가이드를 참고한다.</div>}
      </div>
    );
  }

  const conditions = [job.location, job.career, job.employment].filter(Boolean);
  const terms = processTerms(job.process);

  // 넓은 화면에서는 상세가 제 칸 안에서 따로 스크롤된다. 페이지 스크롤과 묶여 있으면
  // 상세가 길 때 아래를 보려고 목록 끝까지 내려야 했다. 높이는 화면에서 헤더 자리(78px)와
  // 아래 여백(24px)을 뺀 만큼이다.
  return (
    <div
      ref={scrollRef}
      className="lg:max-h-[calc(100dvh-102px)] lg:overflow-y-auto lg:overscroll-contain lg:pb-24"
    >
      {s.narrow && (
        <button type="button" onClick={s.backToSide} className={BTN_BACK}>
          ← 공고 목록
        </button>
      )}

      {job.picked && !job.deleted && (
        <div className="mb-14 rounded-input border border-accent-border bg-accent-bg px-15 py-12 text-13 text-picked-title">
          자기소개서에 추가한 공고다. 답변은 자기소개서 탭에서 작성한다.
        </div>
      )}
      {job.deleted && (
        <div className="mb-14 rounded-input border border-line bg-surface px-15 py-12 text-13 text-muted">
          삭제한 공고다. 다시 수집해도 대기 목록에 추가되지 않는다.
        </div>
      )}

      <div className="mb-14 rounded-card border border-line p-20">
        <div className="mb-18">
          <h1 className="m-0 text-title font-bold tracking-title text-pretty">{job.title}</h1>
          <div className="mt-5 text-13 text-muted">
            {[job.company, ...conditions].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div className="mb-18 flex flex-wrap gap-20">
          <div>
            <div className={LABEL_FIELD}>마감</div>
            <div className="flex items-center gap-8">
              <span className="text-135 text-ink tabular-nums">
                {job.due ? dueText(job.due) : job.dueText || "미정"}
              </span>
              {job.due && <DdayBadge text={dday(job.due)} soon={isSoon(job.due)} variant="card" />}
            </div>
          </div>

          {job.sector && (
            <div className="min-w-0 flex-[1_1_260px]">
              <div className={LABEL_FIELD}>분야</div>
              <div className="text-135 text-body text-pretty">{job.sector}</div>
            </div>
          )}
        </div>

        {terms.length > 0 && (
          <div className="mb-18">
            <div className={LABEL_FIELD}>전형</div>
            <div className="flex flex-wrap gap-6">
              {terms.map((t) => (
                <span
                  key={t.label}
                  className={
                    t.warn
                      ? "rounded-chip bg-rejected-bg px-9 py-5 text-12 font-semibold text-rejected"
                      : "rounded-chip bg-chip px-9 py-5 text-12 font-medium text-body"
                  }
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-18 flex flex-wrap gap-6">
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-input border border-accent-border bg-white px-15 py-12 text-13 font-semibold text-accent hover:text-link-hover"
            >
              채용 페이지 ↗
            </a>
          )}
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-input border border-field bg-white px-15 py-12 text-13 font-medium text-body hover:bg-hover"
          >
            공고 열기 ↗
          </a>
        </div>

        <div>
          <div className={LABEL_FIELD}>이 공고를 고른 이유</div>
          <AutoGrowTextarea
            value={job.note}
            onChange={(e) => s.setJobNote(job.id, e.target.value)}
            placeholder="관심 있는 업무, 지원하려는 이유 (자기소개서에 추가할 때 함께 복사)"
            className="min-h-60 w-full resize-none overflow-hidden rounded-btn border border-line p-14 text-14 leading-memo text-body outline-none focus:border-accent"
          />
        </div>
      </div>

      <CompanyBlock name={job.company} info={job.companyInfo} />

      {job.questions.length > 0 && (
        <div className="mb-14 rounded-card border border-line p-20">
          <div className="mb-12 flex items-center gap-8">
            <span className="text-12 font-semibold text-muted">
              자소서 문항 <span className="tabular-nums">{job.questions.length}</span>개
            </span>
            <span className="ml-auto text-115 text-muted">자기소개서에 추가할 때 문항도 함께 복사된다</span>
          </div>
          <div className="flex flex-col gap-12">
            {job.questions.map((q, i) => (
              <div key={`${q.number ?? i}-${i}`} className="flex items-start gap-10">
                <span className="pt-2 text-12 font-semibold text-numeral tabular-nums">
                  {ordinal(i)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-14 leading-input text-body text-pretty whitespace-pre-line">
                    {q.question}
                  </div>
                  {q.limit && (
                    <div className="mt-4 text-115 text-muted tabular-nums">{q.limit}자</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-6">
        {job.picked || job.deleted ? (
          <button
            type="button"
            onClick={() => s.restoreJob(job.id)}
            className="rounded-input border border-field bg-white px-15 py-9 text-13 font-medium text-body hover:bg-hover"
          >
            대기로 되돌리기
          </button>
        ) : (
          <button
            type="button"
            onClick={() => s.addJobToCover(job)}
            className="rounded-btn bg-accent px-16 py-10 text-14 font-semibold text-white hover:bg-accent-hover"
          >
            자기소개서에 추가
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 전형 조건을 배지 문구로 바꾼다. 사이트가 주지 않은 항목은 아예 빼고,
 * 준비가 더 드는 것(필기, 어학)만 빨갛게 표시한다.
 */
function processTerms(p: JobProcess | null): { label: string; warn?: boolean }[] {
  if (!p) return [];
  const out: { label: string; warn?: boolean }[] = [];

  if (p.work_type) out.push({ label: p.work_type });
  if (p.linkage_recruitment) out.push({ label: "채용연계형" });
  if (p.written_test) {
    const needed = p.written_test.includes("필요함");
    out.push({ label: `필기 ${p.written_test}`, warn: needed });
  }
  if (p.english_score_requirement) out.push({ label: "어학 성적 필요", warn: true });
  if (p.certificate_requirement) out.push({ label: "자격증 필요", warn: true });
  if (p.graduate_condition) out.push({ label: p.graduate_condition });
  if (p.self_introduction_type) out.push({ label: `자소서 ${p.self_introduction_type}` });

  return out;
}

/**
 * 회사가 어떤 곳인지.
 *
 * 숫자를 늘어놓지 않고 게이지로 보여준다. 다섯 항목을 같은 자에 놓으면 어디가
 * 강하고 어디가 약한지 한눈에 읽힌다 — 자소서 글자 수 게이지와 같은 모양이라
 * 화면 전체와도 어울린다.
 *
 * 가져온 것이 없으면 찾아볼 링크만 둔다. 자동 수집이 막혀도 링크는 늘 쓸 수 있다.
 */
function CompanyBlock({ name, info }: { name: string; info: CompanyInfo | null }) {
  if (!name) return null;

  const searchUrl = `https://www.jobplanet.co.kr/search?query=${encodeURIComponent(name)}`;

  if (!info) {
    return (
      <div className="mb-14 rounded-card border border-line px-20 py-16">
        <div className="flex flex-wrap items-center gap-8">
          <span className="text-12 font-semibold text-muted">회사 평판</span>
          <a
            href={searchUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-12 font-medium text-accent hover:text-link-hover"
          >
            잡플래닛에서 찾아보기 ↗
          </a>
        </div>
      </div>
    );
  }

  const r = info.ratings ?? {};
  const rows: [string, number | null | undefined][] = [
    ["복지·급여", r.compensation],
    ["워라밸", r.worklife],
    ["사내문화", r.culture],
    ["승진 기회", r.advancement],
    ["경영진", r.management],
  ];
  const salary = info.salary ?? {};
  const mismatched = info.matched_name && info.matched_name !== name;

  // 회사 규모. 사원수와 매출이 중소·중견·대기업을 가늠하게 해준다.
  const sc = info.scale ?? {};
  const scaleText = [
    sc.employees ? `사원 ${sc.employees.toLocaleString()}명` : null,
    sc.revenue ? `매출 ${money(sc.revenue)}` : null,
    sc.founded ? `${sc.founded}년 설립` : null,
    sc.industry ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  // 내 직무에 해당하는 것만 추린다. 값이 하나도 없는 직무는 빼고.
  const duties: { label: string; d: DutySalary }[] = [];
  for (const [label, d] of [
    ["웹개발", info.duty?.web],
    ["인프라", info.duty?.infra],
  ] as [string, DutySalary | undefined][]) {
    if (d && (d.entry != null || d.mean != null)) duties.push({ label, d });
  }

  return (
    <div className="mb-14 rounded-card border border-line p-20">
      <div className="mb-16 flex flex-wrap items-baseline gap-8">
        <span className="text-12 font-semibold text-muted">회사 평판</span>
        {info.rating != null && (
          <>
            <span className="text-title font-bold tracking-title tabular-nums">
              {info.rating.toFixed(1)}
            </span>
            <span className="text-115 text-muted">/ 5</span>
          </>
        )}
        {info.recommend_rate != null && (
          <span className="text-125 text-muted tabular-nums">
            추천율 {info.recommend_rate}%
          </span>
        )}
        <a
          href={info.url ?? searchUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-12 font-medium text-accent hover:text-link-hover"
        >
          잡플래닛 ↗
        </a>
      </div>

      <div className="mb-16 flex flex-col gap-7">
        {rows.map(([label, value]) =>
          value == null ? null : (
            <div key={label} className="flex items-center gap-10">
              <span className="w-62 flex-none text-115 text-muted">{label}</span>
              <div className="h-5 min-w-0 flex-1 overflow-hidden rounded-bar bg-track">
                <div
                  className="h-full rounded-bar bg-accent"
                  style={{ width: `${Math.min(100, Math.round((value / 5) * 100))}%` }}
                />
              </div>
              <span className="w-24 flex-none text-right text-125 font-semibold text-body tabular-nums">
                {value.toFixed(1)}
              </span>
            </div>
          ),
        )}
      </div>

      {(duties.length > 0 || salary.avg != null) && (
        <div className="border-t border-divider pt-14">
          {duties.map(({ label, d }) => (
            <div key={label} className="mb-10 flex flex-wrap items-baseline gap-x-16 gap-y-4">
              <span className="w-62 flex-none text-115 text-muted">{label}</span>
              {d.entry != null && (
                <span className="text-135 font-semibold text-ink tabular-nums">
                  신입 {d.entry.toLocaleString()}만원
                </span>
              )}
              {d.mean != null && (
                <span className="text-125 text-body tabular-nums">
                  평균 {d.mean.toLocaleString()}만원
                </span>
              )}
              {d.rank != null && (
                <span className="text-115 text-muted tabular-nums">업계 {d.rank}위</span>
              )}
            </div>
          ))}

          {salary.avg != null && (
            <div className="flex flex-wrap items-baseline gap-x-16 gap-y-4">
              <span className="w-62 flex-none text-115 text-muted">전체</span>
              <span className="text-125 text-body tabular-nums">
                평균 {salary.avg.toLocaleString()}만원
              </span>
              {salary.min != null && salary.max != null && (
                <span className="text-115 text-muted tabular-nums">
                  {salary.min.toLocaleString()} ~ {salary.max.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {scaleText && <div className="mt-12 text-115 text-muted">{scaleText}</div>}

      {mismatched && (
        <div className="mt-6 text-115 text-muted">{info.matched_name} 기준</div>
      )}
    </div>
  );
}

/** 백만원 단위로 오는 매출을 억·조로 읽기 쉽게 바꾼다. */
function money(millionWon: number): string {
  const eok = millionWon / 100;
  if (eok >= 10000) return `${(eok / 10000).toFixed(1)}조`;
  if (eok >= 1) return `${Math.round(eok).toLocaleString()}억`;
  return `${millionWon.toLocaleString()}백만`;
}
