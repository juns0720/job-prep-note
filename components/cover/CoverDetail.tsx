"use client";

import { CoverQuestionCard } from "./CoverQuestionCard";
import { BTN_BACK, LABEL_FIELD } from "../ui/classes";
import { DdayBadge } from "../ui/DdayBadge";
import { EVENT_LABEL, STATUS_LABEL } from "../ui/StatusBadge";
import { downloadCover } from "@/lib/cover-md";
import { dday, isSoon } from "@/lib/date";
import { EVENT_KINDS, PROCESS_STAGES, isStage, isSubmitted } from "@/lib/status";
import { useStudyNote } from "@/lib/store";
import type { CompanyStatus, ProcessStage } from "@/lib/types";

/** "stage" 자리에 전형 단계 다섯을 묶은 고르기 칸 하나가 들어간다. */
const STATUS_ORDER: (Exclude<CompanyStatus, ProcessStage> | "stage")[] = [
  "draft",
  "writing",
  "applied",
  "stage",
  "passed",
  "rejected",
];

const STATUS_PICKED: Record<Exclude<CompanyStatus, ProcessStage> | "stage", string> = {
  draft: "border-draft-bg bg-draft-bg text-draft",
  writing: "border-accent-border bg-accent-bg text-accent",
  applied: "border-applied-bg bg-applied-bg text-applied",
  // 전형은 지원 완료와 헷갈리지 않게 진한 파랑으로 채운다. 연한 파랑(지원 완료) → 진한 파랑(전형) 순으로 짙어진다.
  stage: "border-accent bg-accent text-white",
  passed: "border-passed-bg bg-passed-bg text-passed",
  rejected: "border-rejected-bg bg-rejected-bg text-rejected",
};

const STATUS_IDLE =
  "rounded-input border border-line bg-white px-12 py-8 text-13 font-medium text-muted hover:bg-hover";

export function CoverDetail() {
  const s = useStudyNote();

  const inPeriod = s.companies.filter((c) => c.period === s.period);
  const co = inPeriod.find((c) => c.id === s.coverId) ?? inPeriod[0] ?? null;

  if (!co) {
    return (
      <div className="rounded-card border border-dashed border-field px-20 py-56 text-center">
        <div className="mb-14 text-14 text-muted">왼쪽에서 회사를 추가하면 문항을 정리할 수 있다.</div>
        <button
          type="button"
          onClick={s.addCompany}
          className="rounded-btn bg-accent px-16 py-10 text-14 font-semibold text-white hover:bg-accent-hover"
        >
          회사 추가
        </button>
      </div>
    );
  }

  return (
    <div>
      {s.narrow && (
        <button type="button" onClick={s.backToSide} className={BTN_BACK}>
          ← 회사 목록
        </button>
      )}

      <div className="mb-14 rounded-card border border-line p-20">
        <div className="mb-18">
          <h1 className="m-0 text-title font-bold tracking-title">{co.name}</h1>
          <div className="mt-5 text-13 text-muted">
            {co.role} · {co.period}
          </div>
        </div>

        <div className="mb-18 flex flex-wrap gap-20">
          <div>
            <div className={LABEL_FIELD}>마감일</div>
            <div className="flex items-center gap-8">
              <input
                type="date"
                value={co.due}
                onChange={(e) => s.setCompanyField(co.id, "due", e.target.value)}
                className="rounded-input border border-field px-10 py-8 text-135 text-ink outline-none tabular-nums focus:border-accent"
              />
              <DdayBadge text={dday(co.due)} soon={isSoon(co.due)} variant="card" />
            </div>
          </div>

          <div className="min-w-0 flex-[1_1_260px]">
            <div className={LABEL_FIELD}>진행 상태</div>
            <div className="flex flex-wrap gap-6">
              {STATUS_ORDER.map((st) => {
                if (st === "stage") {
                  // 서류 합격 · 코딩테스트 · 과제 · 인적성 · 면접을 버튼 하나로 묶는다.
                  // 고르기 전에는 "전형"이, 고른 뒤에는 그 단계 이름이 보인다.
                  const picked = isStage(co.status);
                  return (
                    <select
                      key={st}
                      aria-label="전형 단계"
                      value={picked ? co.status : ""}
                      onChange={(e) => s.setCompanyField(co.id, "status", e.target.value as ProcessStage)}
                      className={
                        picked
                          ? `rounded-input border px-10 py-8 text-13 font-semibold ${STATUS_PICKED.stage}`
                          : `${STATUS_IDLE} px-10`
                      }
                    >
                      <option value="" disabled hidden>
                        전형
                      </option>
                      {/* 고른 칸이 흰 글자라, 펼친 목록이 그 색을 물려받지 않게 되돌린다. */}
                      {PROCESS_STAGES.map((stage) => (
                        <option key={stage} value={stage} className="bg-white text-ink">
                          {STATUS_LABEL[stage]}
                        </option>
                      ))}
                    </select>
                  );
                }
                const picked = co.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => s.setCompanyField(co.id, "status", st)}
                    className={
                      picked ? `rounded-input border px-12 py-8 text-13 font-semibold ${STATUS_PICKED[st]}` : STATUS_IDLE
                    }
                  >
                    {STATUS_LABEL[st]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 전형 일정은 낸 뒤에 생긴다. 미제출·작성 중일 때는 적어 둔 것이 있을 때만 보인다. */}
        {(isSubmitted(co) || co.events.length > 0) && (
          <div className="mb-18">
            <div className="mb-7 flex items-center gap-8">
              <span className="text-12 font-semibold text-muted">전형 일정</span>
              <button
                type="button"
                onClick={() => s.addCompanyEvent(co.id)}
                className="ml-auto rounded-input border border-field bg-white px-12 py-7 text-125 font-semibold text-body hover:bg-hover"
              >
                + 일정 추가
              </button>
            </div>
            {co.events.length === 0 ? (
              <div className="text-125 text-muted">코딩테스트·면접 날짜를 적으면 캘린더에 뜬다.</div>
            ) : (
              <div className="flex flex-col gap-6">
                {co.events.map((ev) => (
                  <div key={ev.id} className="flex flex-wrap items-center gap-6">
                    <select
                      aria-label="일정 종류"
                      value={ev.kind}
                      onChange={(e) =>
                        s.setCompanyEvent(co.id, ev.id, { kind: e.target.value as (typeof EVENT_KINDS)[number] })
                      }
                      className="rounded-input border border-field bg-white px-10 py-8 text-13 font-medium text-ink"
                    >
                      {EVENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {EVENT_LABEL[k]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      aria-label="일정 날짜"
                      value={ev.date}
                      onChange={(e) => s.setCompanyEvent(co.id, ev.id, { date: e.target.value })}
                      className="rounded-input border border-field px-10 py-8 text-13 text-ink outline-none tabular-nums focus:border-accent"
                    />
                    <input
                      aria-label="일정 메모"
                      value={ev.memo}
                      onChange={(e) => s.setCompanyEvent(co.id, ev.id, { memo: e.target.value })}
                      placeholder="1차, 14:00 판교"
                      className="min-w-0 flex-[1_1_140px] rounded-input border border-line px-11 py-8 text-13 text-body outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => s.removeCompanyEvent(co.id, ev.id)}
                      className="px-8 py-8 text-12 font-medium text-muted hover:text-rejected"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={LABEL_FIELD}>채용 공고 링크</div>
        <div className="mb-18 flex flex-wrap gap-8">
          <input
            value={co.url}
            onChange={(e) => s.setCompanyField(co.id, "url", e.target.value)}
            placeholder="https://"
            className="min-w-0 flex-[1_1_240px] rounded-input border border-line px-11 py-9 text-13 text-body outline-none focus:border-accent"
          />
          <a
            href={co.url}
            target="_blank"
            rel="noopener"
            className="rounded-input border border-field px-12 py-9 text-13 font-medium whitespace-nowrap text-body hover:bg-hover hover:no-underline"
          >
            공고 열기 ↗
          </a>
        </div>

        <div className={LABEL_FIELD}>이 직무를 고른 이유</div>
        <textarea
          value={co.memo}
          onChange={(e) => s.setCompanyField(co.id, "memo", e.target.value)}
          placeholder="공고에서 본 업무와 내가 해둔 것을 연결해서 적는다."
          className="h-88 w-full resize-y rounded-btn border border-line px-13 py-11 text-14 leading-memo text-body outline-none focus:border-accent"
        />
      </div>

      <div className="mt-22 mb-12 flex items-center gap-10">
        <h2 className="m-0 text-15 font-semibold tracking-name">자소서 문항 {co.questions.length}개</h2>
        <button
          type="button"
          onClick={() => downloadCover(co)}
          className="ml-auto rounded-input border border-field bg-white px-12 py-7 text-125 font-semibold text-body hover:bg-hover"
        >
          .md 내려받기
        </button>
        <button
          type="button"
          onClick={() => s.addCoverQuestion(co.id)}
          className="rounded-input border border-field bg-white px-12 py-7 text-125 font-semibold text-body hover:bg-hover"
        >
          + 문항 추가
        </button>
      </div>

      {co.questions.map((q, i) => (
        <CoverQuestionCard key={q.id} companyId={co.id} question={q} index={i} />
      ))}
    </div>
  );
}
