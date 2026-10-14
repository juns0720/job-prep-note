"use client";

import { useState } from "react";
import { EVENT_LABEL } from "../ui/StatusBadge";
import { isSoon } from "@/lib/date";
import { seoulToday } from "@/lib/download";
import { isSubmitted } from "@/lib/status";
import { useStudyNote } from "@/lib/store";
import type { Company } from "@/lib/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const BTN_NAV =
  "rounded-mini border border-field bg-white px-12 py-7 text-125 font-medium text-body hover:bg-hover";

/** 달력 한 칸에 올리는 것. 아직 안 낸 회사의 마감일이거나 적어 둔 전형 일정이다. */
type Item = {
  key: string;
  date: string;
  companyId: string;
  text: string;
  type: "due" | "event";
  soon: boolean;
};

/**
 * 채용 캘린더. 시기와 상관없이 모든 회사를 본다.
 * - 미제출·작성 중인 회사의 마감일
 * - 회사마다 적어 둔 전형 일정(코딩테스트, 면접 ...)
 * 누르면 자기소개서 탭의 그 회사로 간다. 좁은 화면에서는 7칸이 너무 좁아 날짜별 목록으로 본다.
 */
export function CalendarView() {
  const s = useStudyNote();
  const today = seoulToday();
  // 보고 있는 달. "2026-10"
  const [month, setMonth] = useState(today.slice(0, 7));

  const items = collectItems(s.companies).filter((it) => it.date.startsWith(month));
  const byDate = new Map<string, Item[]>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);

  const [year, mon] = month.split("-").map(Number);

  return (
    <div>
      <div className="mb-14 flex flex-wrap items-center gap-8">
        <h1 className="m-0 mr-8 text-title font-bold tracking-title tabular-nums">
          {year}년 {mon}월
        </h1>
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className={BTN_NAV} aria-label="이전 달">
          ‹
        </button>
        <button type="button" onClick={() => setMonth(today.slice(0, 7))} className={BTN_NAV}>
          오늘
        </button>
        <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className={BTN_NAV} aria-label="다음 달">
          ›
        </button>
        <div className="ml-auto flex items-center gap-10 text-12 text-muted">
          <span className="flex items-center gap-5">
            <span className="rounded-badge bg-chip px-6 py-3 text-11 font-semibold text-body">마감</span>
            미제출·작성 중
          </span>
          <span className="flex items-center gap-5">
            <span className="rounded-badge bg-applied-bg px-6 py-3 text-11 font-semibold text-applied">전형</span>
            적어 둔 일정
          </span>
        </div>
      </div>

      {s.narrow ? (
        <AgendaList byDate={byDate} today={today} onOpen={s.openCompany} />
      ) : (
        <MonthGrid year={year} mon={mon} byDate={byDate} today={today} onOpen={s.openCompany} />
      )}
    </div>
  );
}

function MonthGrid({
  year,
  mon,
  byDate,
  today,
  onOpen,
}: {
  year: number;
  mon: number;
  byDate: Map<string, Item[]>;
  today: string;
  onOpen: (companyId: string) => void;
}) {
  // 일요일부터 시작한다. 앞뒤로 남는 칸은 비워 둔다.
  const offset = new Date(year, mon - 1, 1).getDay();
  const days = new Date(year, mon, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(isoDate(year, mon, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="grid grid-cols-7 bg-surface">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-8 text-center text-12 font-semibold text-muted">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => (
          <div
            key={date ?? `blank-${i}`}
            className={`min-h-108 min-w-0 border-t border-divider p-6 ${i % 7 === 0 ? "" : "border-l"} ${
              date ? "" : "bg-surface"
            }`}
          >
            {date && (
              <>
                <div className="mb-4 flex">
                  <span
                    className={
                      date === today
                        ? "rounded-chip bg-accent px-6 py-1 text-12 font-bold text-white tabular-nums"
                        : "px-6 py-1 text-12 font-medium text-muted tabular-nums"
                    }
                  >
                    {Number(date.slice(8))}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {(byDate.get(date) ?? []).map((it) => (
                    <ItemChip key={it.key} item={it} onOpen={onOpen} />
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaList({
  byDate,
  today,
  onOpen,
}: {
  byDate: Map<string, Item[]>;
  today: string;
  onOpen: (companyId: string) => void;
}) {
  const dates = [...byDate.keys()].sort();
  if (dates.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-field px-20 py-56 text-center text-14 text-muted">
        이 달에 잡힌 마감이나 일정이 없다.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-14">
      {dates.map((date) => {
        const d = new Date(`${date}T00:00:00`);
        return (
          <div key={date}>
            <div
              className={`mb-6 text-12 font-semibold tabular-nums ${date === today ? "text-accent" : "text-muted"}`}
            >
              {Number(date.slice(5, 7))}.{Number(date.slice(8))} ({WEEKDAYS[d.getDay()]})
              {date === today && " · 오늘"}
            </div>
            <div className="flex flex-col gap-4">
              {(byDate.get(date) ?? []).map((it) => (
                <ItemChip key={it.key} item={it} onOpen={onOpen} large />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemChip({ item, onOpen, large }: { item: Item; onOpen: (companyId: string) => void; large?: boolean }) {
  // 마감은 회색(임박이면 빨강), 전형 일정은 지원 완료와 같은 파랑.
  const tone =
    item.type === "event"
      ? "bg-applied-bg text-applied hover:bg-accent-border"
      : item.soon
        ? "bg-rejected-bg text-rejected hover:bg-divider"
        : "bg-chip text-body hover:bg-divider";
  const size = large ? "rounded-chip px-10 py-8 text-13" : "rounded-badge px-6 py-3 text-115";
  return (
    <button
      type="button"
      title={item.text}
      onClick={() => onOpen(item.companyId)}
      className={`block w-full truncate text-left font-semibold ${size} ${tone}`}
    >
      {item.text}
    </button>
  );
}

function collectItems(companies: Company[]): Item[] {
  const items: Item[] = [];
  for (const c of companies) {
    if (!isSubmitted(c) && c.due) {
      items.push({
        key: `due-${c.id}`,
        date: c.due,
        companyId: c.id,
        text: `${c.name} 마감`,
        type: "due",
        soon: isSoon(c.due),
      });
    }
    for (const ev of c.events) {
      if (!ev.date) continue;
      items.push({
        key: `event-${ev.id}`,
        date: ev.date,
        companyId: c.id,
        text: `${c.name} · ${EVENT_LABEL[ev.kind]}${ev.memo ? ` ${ev.memo}` : ""}`,
        type: "event",
        soon: false,
      });
    }
  }
  // 같은 날에는 마감을 먼저, 그다음 회사 이름순.
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "due" ? -1 : 1;
    return a.text.localeCompare(b.text, "ko");
  });
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function shiftMonth(month: string, step: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + step, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
