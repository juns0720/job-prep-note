"use client";

import type { ReactNode } from "react";
import filter from "@/lib/job-filter.json";
import { useStudyNote } from "@/lib/store";
import type { JobRules as Rules } from "@/lib/types";

const EMPTY: Rules = { roles: [], careers: [], stacks: [] };

/**
 * 공고 필터링 규칙. 누르면 바로 저장된다. 수집기(scripts/collect.mjs)가 읽어 거르고,
 * 맞추는 방식은 scripts/lib/rules.mjs에 있다. 스택은 고른 직무의 줄만 보여준다.
 */
export function JobRules() {
  const s = useStudyNote();
  const rules = s.jobRules ?? EMPTY;

  const toggle = (key: keyof Rules, id: string) => {
    const list = rules[key];
    s.saveJobRules({ ...rules, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };

  const stackRows = filter.roles
    .filter((r) => rules.roles.includes(r.id))
    .map((r) => ({ label: r.label, options: filter.stacks[r.id as keyof typeof filter.stacks] ?? [] }));

  return (
    <div className="mb-16">
      <div className="mb-7 text-12 font-semibold text-muted">필터링 규칙</div>
      <div className="flex flex-col gap-6">
        <Row label="직무">
          {filter.roles.map((o) => (
            <Chip key={o.id} label={o.label} on={rules.roles.includes(o.id)} onClick={() => toggle("roles", o.id)} />
          ))}
        </Row>
        <Row label="경력">
          {filter.careers.map((o) => (
            <Chip key={o.id} label={o.label} on={rules.careers.includes(o.id)} onClick={() => toggle("careers", o.id)} />
          ))}
        </Row>
        {stackRows.map((row) => (
          <Row key={row.label} label={row.label}>
            {row.options.map((o) => (
              <Chip key={o.id} label={o.id} on={rules.stacks.includes(o.id)} onClick={() => toggle("stacks", o.id)} />
            ))}
          </Row>
        ))}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-8">
      <span className="w-62 flex-none pt-7 text-115 text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-4">{children}</div>
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={
        on
          ? "rounded-mini border border-accent-border bg-accent-bg px-10 py-6 text-12 font-semibold text-picked-title"
          : "rounded-mini border border-field bg-white px-10 py-6 text-12 font-medium text-muted hover:text-ink"
      }
    >
      {label}
    </button>
  );
}
