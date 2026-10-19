import type { Database } from "@/lib/supabase/types";
import type {
  Company,
  CompanyEvent,
  CompanyInfo,
  JobPosting,
  JobProcess,
  JobQuestion,
  JobRules,
  MaterialGroup,
  ProfileColumn,
  ProfileFile,
  ProfileKind,
  ProfileLinks,
  ProfileSection,
  Project,
  Topic,
} from "@/lib/types";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type CoverQuestionRow = Database["public"]["Tables"]["cover_questions"]["Row"];
type TopicRow = Database["public"]["Tables"]["topics"]["Row"];
type InterviewQuestionRow = Database["public"]["Tables"]["interview_questions"]["Row"];
type JobPostingRow = Database["public"]["Tables"]["job_postings"]["Row"];
type JobRulesRow = Database["public"]["Tables"]["job_rules"]["Row"];
type ProfileLinksRow = Database["public"]["Tables"]["profile_links"]["Row"];
type MaterialGroupRow = Database["public"]["Tables"]["material_groups"]["Row"];
type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type CompanyEventRow = Database["public"]["Tables"]["company_events"]["Row"];
type ProfileSectionRow = Database["public"]["Tables"]["profile_sections"]["Row"];
type ProfileFieldRow = Database["public"]["Tables"]["profile_fields"]["Row"];
type ProfileEntryRow = Database["public"]["Tables"]["profile_entries"]["Row"];
type ProfileFileRow = Database["public"]["Tables"]["profile_files"]["Row"];

export function mapProjectRow(row: ProjectRow): Project {
  return { id: row.id, name: row.name, description: row.description, keywords: row.keywords };
}

export function mapMaterialGroupRow(row: MaterialGroupRow, items: MaterialRow[]): MaterialGroup {
  return {
    id: row.id,
    name: row.name,
    items: [...items].sort((a, b) => a.sort_order - b.sort_order).map((m) => ({ id: m.id, title: m.title ?? "", t: m.body, final: m.final ?? false })),
  };
}

export function mapCompanyRow(row: CompanyRow, questions: CoverQuestionRow[], events: CompanyEventRow[]): Company {
  return {
    id: row.id,
    period: row.period,
    name: row.name,
    role: row.role,
    due: row.due ?? "",
    status: row.status,
    url: row.url,
    memo: row.memo,
    createdAt: row.created_at,
    questions: [...questions]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => ({ id: q.id, t: q.body, limit: q.char_limit, a: q.answer })),
    events: sortEvents(events.map(mapCompanyEventRow)),
  };
}

export function mapCompanyEventRow(row: CompanyEventRow): CompanyEvent {
  return { id: row.id, kind: row.kind, date: row.date ?? "", memo: row.memo };
}

/** 일정은 날짜순. 날짜를 아직 안 정한 것은 맨 뒤에 둔다. */
export function sortEvents(events: CompanyEvent[]): CompanyEvent[] {
  return [...events].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

export function mapTopicRow(row: TopicRow, questions: InterviewQuestionRow[]): Topic {
  return {
    id: row.id,
    name: row.name,
    questions: [...questions]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => ({ id: q.id, t: q.body, k: q.keywords, a: q.answer })),
  };
}

export function mapJobRulesRow(row: JobRulesRow): JobRules {
  return { roles: row.roles ?? [], careers: row.careers ?? [], stacks: row.stacks ?? [] };
}

export function mapProfileLinksRow(row: ProfileLinksRow): ProfileLinks {
  return { portfolio: row.portfolio ?? "", resume: row.resume ?? "" };
}

export function mapJobPostingRow(row: JobPostingRow): JobPosting {
  return {
    id: row.id,
    source: row.source,
    url: row.url,
    company: row.company,
    title: row.title,
    location: row.location,
    career: row.career,
    employment: row.employment,
    sector: row.sector,
    dueText: row.due_text,
    due: row.due ?? "",
    picked: row.picked,
    dismissed: row.dismissed,
    deleted: row.deleted ?? false,
    note: row.note,
    collectedAt: row.collected_at,
    applyUrl: row.apply_url ?? "",
    process: (row.process as JobProcess | null) ?? null,
    questions: Array.isArray(row.questions) ? (row.questions as JobQuestion[]) : [],
    companyInfo: (row.company_info as CompanyInfo | null) ?? null,
  };
}

/** company_id / topic_id를 키로 문항을 묶는다. */
export function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

const PROFILE_KINDS: ProfileKind[] = ["fields", "list", "text"];

/** jsonb라 모양을 믿지 않고 한 번 거른다. 손으로 고친 행이 섞여도 화면이 죽지 않게. */
function toColumns(v: unknown): ProfileColumn[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && typeof c.id === "string")
    .map((c) => ({ id: c.id as string, name: typeof c.name === "string" ? c.name : "", wide: c.wide === true }));
}

function toCells(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) if (typeof val === "string") out[k] = val;
  return out;
}

export function mapProfileSectionRow(row: ProfileSectionRow, fields: ProfileFieldRow[], entries: ProfileEntryRow[]): ProfileSection {
  return {
    id: row.id,
    name: row.name,
    kind: PROFILE_KINDS.includes(row.kind as ProfileKind) ? (row.kind as ProfileKind) : "fields",
    columns: toColumns(row.columns),
    note: row.note ?? "",
    body: row.body ?? "",
    fields: [...fields]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => ({ id: f.id, label: f.label, value: f.value, note: f.note })),
    entries: [...entries].sort((a, b) => a.sort_order - b.sort_order).map((e) => ({ id: e.id, cells: toCells(e.cells) })),
  };
}

export function mapProfileFileRow(row: ProfileFileRow): ProfileFile {
  return {
    id: row.id,
    kind: row.kind === "photo" ? "photo" : "document",
    label: row.label,
    path: row.path,
    fileName: row.file_name,
    mime: row.mime,
    size: Number(row.size),
  };
}
