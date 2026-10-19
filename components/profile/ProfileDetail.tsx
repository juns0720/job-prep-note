"use client";

import { ProfileEntries } from "./ProfileEntries";
import { ProfileFields } from "./ProfileFields";
import { ProfileFiles } from "./ProfileFiles";
import { AutoGrowTextarea } from "../ui/AutoGrowTextarea";
import { BTN_BACK, LABEL_FIELD } from "../ui/classes";
import { SortButton } from "../ui/ListToggle";
import { charLength } from "@/lib/text";
import { emptyCount } from "@/lib/profile";
import { PROFILE_FILES, useStudyNote } from "@/lib/store";
import type { ProfileKind, ProfileSection } from "@/lib/types";

const KIND_OPTIONS: { value: ProfileKind; label: string }[] = [
  { value: "fields", label: "항목" },
  { value: "list", label: "여러 건" },
  { value: "text", label: "긴 글" },
];

/** 섹션이 비어 있을 때만 형식을 바꿀 수 있다. 바꾸면 다른 형식으로 쓴 것이 화면에서 사라진다. */
function isBlank(sec: ProfileSection) {
  return sec.fields.length === 0 && sec.entries.length === 0 && sec.columns.length === 0 && !sec.body;
}

/**
 * 고른 섹션 하나. 공채 지원서의 한 단계처럼 제목 아래에 칸을 늘어놓는다.
 * 제목은 바로 고친다. 맨 위의 입력 규칙에는 값을 양식에 맞추는 방법을 적는다 — AI가
 * 지원서를 채울 때 값과 같이 읽는다.
 */
export function ProfileDetail() {
  const s = useStudyNote();

  const back = s.narrow && (
    <button type="button" onClick={s.backToSide} className={BTN_BACK}>
      ← 섹션 목록
    </button>
  );

  if (s.sectionId === PROFILE_FILES) {
    return (
      <div>
        {back}
        <ProfileFiles />
      </div>
    );
  }

  const sec = s.profileSections.find((x) => x.id === s.sectionId) ?? s.profileSections[0] ?? null;

  if (!sec) {
    return (
      <div className="rounded-card border border-dashed border-field px-20 py-56 text-center">
        <div className="mb-14 text-14 text-muted">왼쪽에서 섹션을 추가하면 지원서에 넣을 값을 모을 수 있다.</div>
        <button
          type="button"
          onClick={s.addSection}
          className="rounded-btn bg-accent px-16 py-10 text-14 font-semibold text-white hover:bg-accent-hover"
        >
          섹션 추가
        </button>
      </div>
    );
  }

  const empty = emptyCount(sec);
  const summary =
    sec.kind === "fields"
      ? `항목 ${sec.fields.length}개`
      : sec.kind === "list"
        ? `${sec.entries.length}건 · 칸 ${sec.columns.length}개`
        : `${charLength(sec.body).toLocaleString()}자`;

  return (
    <div>
      {back}

      <div className="flex flex-wrap items-start gap-12">
        <div className="min-w-0 flex-[1_1_240px]">
          {/* 한 줄짜리라 줄바꿈은 지운다. 길어지면 줄이 접혀 칸이 늘어난다. */}
          <AutoGrowTextarea
            value={sec.name}
            onChange={(e) => s.setSection(sec.id, { name: e.target.value.replace(/\n/g, "") })}
            placeholder="섹션 이름"
            aria-label="섹션 이름"
            className="-ml-8 w-full resize-none overflow-hidden rounded-input border border-transparent px-8 py-2 text-title font-bold tracking-title text-ink outline-none hover:bg-surface focus:border-accent focus:bg-white"
          />
          <div className="mt-3 text-13 text-muted">
            {summary}
            {empty > 0 && <span className="font-semibold text-rejected"> · 빈 칸 {empty}</span>}
          </div>
        </div>
        <div className="flex items-center gap-6 pt-4">
          {isBlank(sec) &&
            KIND_OPTIONS.map((o) => (
              <SortButton
                key={o.value}
                label={o.label}
                active={sec.kind === o.value}
                onClick={() => s.setSection(sec.id, { kind: o.value })}
              />
            ))}
          <button
            type="button"
            onClick={() => s.removeSection(sec)}
            className="px-8 py-10 text-12 font-medium text-muted hover:text-rejected"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="mt-16">
        <div className={LABEL_FIELD}>입력 규칙</div>
        <AutoGrowTextarea
          value={sec.note}
          onChange={(e) => s.setSection(sec.id, { note: e.target.value })}
          placeholder="양식에 맞춰 바꾸는 방법, 입력할 때 지킬 것을 적는다."
          className="w-full resize-none overflow-hidden rounded-btn border border-line bg-surface px-13 py-11 text-13 leading-memo text-body outline-none focus:border-accent focus:bg-white"
        />
      </div>

      <div className="mt-18">
        {sec.kind === "fields" ? (
          <ProfileFields sec={sec} />
        ) : sec.kind === "list" ? (
          <ProfileEntries sec={sec} />
        ) : (
          <div>
            <AutoGrowTextarea
              value={sec.body}
              onChange={(e) => s.setSection(sec.id, { body: e.target.value })}
              placeholder="비어 있음"
              aria-label={sec.name}
              className="min-h-160 w-full resize-none overflow-hidden rounded-btn border border-line px-13 py-11 text-14 leading-answer text-body outline-none focus:border-accent"
            />
            <div className="mt-6 text-right text-125 text-muted tabular-nums">{charLength(sec.body).toLocaleString()}자</div>
          </div>
        )}
      </div>
    </div>
  );
}
