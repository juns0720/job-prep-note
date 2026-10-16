"use client";

import { useEffect, useState } from "react";
import { BTN_CANCEL, BTN_SAVE, INPUT_PANEL, LABEL_MINI, LIST_CARD } from "../ui/classes";
import { useStudyNote } from "@/lib/store";
import type { ProfileLinks as Links } from "@/lib/types";

const ROWS: { key: keyof Links; label: string }[] = [
  { key: "portfolio", label: "포트폴리오" },
  { key: "resume", label: "이력서" },
];

/** 복사했다고 보여주는 시간 */
const COPIED_MS = 1500;

/**
 * 지원서에 붙여 넣을 내 링크. 회사마다 내는 게 같아서 회사가 아니라 화면 위에 하나만 둔다.
 * 편집 칸은 이 블록 안에서만 쓰므로 store가 아니라 여기서 들고, [저장]을 누를 때 저장한다.
 */
export function ProfileLinks() {
  const s = useStudyNote();
  const [draft, setDraft] = useState<Links | null>(null);
  const [copied, setCopied] = useState<keyof Links | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (key: keyof Links) => {
    try {
      await navigator.clipboard.writeText(s.profileLinks[key]);
      setCopied(key);
    } catch (e) {
      console.error("링크 복사 실패", e);
    }
  };

  const save = () => {
    if (!draft) return;
    s.saveProfileLinks({ portfolio: draft.portfolio.trim(), resume: draft.resume.trim() });
    setDraft(null);
  };

  return (
    <div className="mb-16">
      <div className="mb-7 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">내 링크</span>
        {!draft && (
          <button
            type="button"
            onClick={() => setDraft(s.profileLinks)}
            className="ml-auto p-10 text-12 font-medium text-muted hover:text-ink"
          >
            수정
          </button>
        )}
      </div>

      {draft ? (
        <div className="rounded-panel border border-field bg-surface p-12">
          {ROWS.map(({ key, label }) => (
            <div key={key} className="mb-10">
              <div className={LABEL_MINI}>{label}</div>
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                placeholder="https://"
                className={`${INPUT_PANEL} text-13`}
              />
            </div>
          ))}
          <div className="flex gap-6">
            <button type="button" onClick={save} className={BTN_SAVE}>
              저장
            </button>
            <button type="button" onClick={() => setDraft(null)} className={BTN_CANCEL}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className={`${LIST_CARD} divide-y divide-divider`}>
          {ROWS.map(({ key, label }) => {
            const url = s.profileLinks[key];
            return (
              <div key={key} className="flex items-center gap-8 pl-14">
                <span className="w-64 shrink-0 text-12 font-semibold text-muted">{label}</span>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener"
                    className="min-w-0 flex-1 truncate text-13 text-body hover:text-accent"
                  >
                    {url}
                  </a>
                ) : (
                  <span className="flex-1 text-13 text-muted">비어 있음</span>
                )}
                <button
                  type="button"
                  onClick={() => copy(key)}
                  disabled={!url}
                  className="shrink-0 p-10 text-12 font-semibold text-accent hover:text-link-hover disabled:text-numeral"
                >
                  {copied === key ? "복사됨" : "복사"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
