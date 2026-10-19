import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateItem, CreateKind, SaveItem, SaveKind, SaveStatus } from "@/lib/save-queue";

/**
 * app/api/save가 받은 저장 항목 하나를 DB에 반영한다.
 *
 * 같은 탭에서 보낸 요청은 번호(seq)가 지금 행에 적힌 것보다 클 때만 반영한다
 * (supabase/schema.sql의 save_tab · save_seq). 옛 요청이 늦게 도착하면 아무것도 바꾸지 않고
 * "stale"을 돌려준다. 큐는 매 요청에 아직 확인 못 받은 필드를 전부 담아 보내므로, 더 새
 * 요청이 이미 들어갔다면 옛 요청의 값은 거기 다 들어 있다 — 버려도 잃는 것이 없다.
 */

/** kind마다 저장하는 테이블과 고칠 수 있는 필드(클라이언트 이름 → DB 칸). 바디는 클라이언트가 보낸 것이라 여기 없는 필드는 버린다. */
const ROW_KINDS: Record<Exclude<SaveKind, "materialOrder">, { table: string; fields: Record<string, string> }> = {
  company: {
    table: "companies",
    fields: { name: "name", role: "role", due: "due", status: "status", url: "url", memo: "memo" },
  },
  coverQuestion: { table: "cover_questions", fields: { t: "body", limit: "char_limit", a: "answer" } },
  companyEvent: { table: "company_events", fields: { kind: "kind", date: "date", memo: "memo" } },
  topic: { table: "topics", fields: { name: "name" } },
  interviewQuestion: { table: "interview_questions", fields: { t: "body", k: "keywords", a: "answer" } },
  materialGroup: { table: "material_groups", fields: { name: "name" } },
  material: { table: "materials", fields: { title: "title", t: "body", final: "final" } },
  project: { table: "projects", fields: { name: "name", description: "description", keywords: "keywords" } },
  job: { table: "job_postings", fields: { note: "note" } },
  // 칸 목록(columns)과 건의 값(cells)은 jsonb라 통째로 보낸다.
  profileSection: {
    table: "profile_sections",
    fields: { name: "name", kind: "kind", columns: "columns", note: "note", body: "body" },
  },
  profileField: { table: "profile_fields", fields: { label: "label", value: "value", note: "note" } },
  profileEntry: { table: "profile_entries", fields: { cells: "cells" } },
  profileFile: { table: "profile_files", fields: { label: "label" } },
};

/**
 * 순서 칸(save_tab·save_seq, order_tab·order_seq)을 만드는 마이그레이션(0011·0016)을 DB에 안
 * 올렸는지. 실제로 0011이 빠진 채 배포돼, 모든 저장이 이 오류로 실패하고 탭을 닫으면 쓴 것이
 * 사라졌다. 이때는 순서 확인 없이 값만이라도 저장한다.
 *
 * 바꿀 값에 없는 칸이 있으면 PostgREST가 PGRST204로, 조건(or)에만 있으면 Postgres가
 * 42703(undefined_column)으로 막는다.
 */
function missingColumn(error: { code?: string } | null) {
  return error?.code === "PGRST204" || error?.code === "42703";
}

/** 다른 탭이 고쳤거나, 같은 탭이 더 작은 번호로 고친 행만 고른다. tab은 라우트에서 uuid인지 확인했다. */
function newerThanRow(prefix: "save" | "order", tab: string, seq: number) {
  return `${prefix}_tab.is.null,${prefix}_tab.neq.${tab},${prefix}_seq.lt.${seq}`;
}

export async function saveItem(
  // 테이블 이름을 kind에서 골라 쓰므로 Database 제네릭을 떼고 쓴다. 칸은 ROW_KINDS가 거른다.
  db: SupabaseClient,
  userId: string,
  tab: string,
  item: SaveItem,
): Promise<SaveStatus> {
  if (item.kind === "materialOrder") {
    // 컨셉 안의 sort_order를 0부터 다시 매긴다. 두 행만 맞바꾸면 sort_order가 같은 행끼리는
    // 순서가 안 바뀐다. 행마다 따로 번호를 확인하니, 옛 순서 요청이
    // 늦게 와도 새 순서를 받은 행은 그대로 남는다.
    const ids = Array.isArray(item.patch.ids) ? item.patch.ids.filter((v): v is string => typeof v === "string") : [];
    const reorder = (ordered: boolean) =>
      Promise.all(
        ids.map((id, i) => {
          const query = db
            .from("materials")
            .update(ordered ? { sort_order: i, order_tab: tab, order_seq: item.seq } : { sort_order: i })
            .eq("id", id)
            .eq("user_id", userId);
          return ordered ? query.or(newerThanRow("order", tab, item.seq)) : query;
        }),
      );
    let results = await reorder(true);
    if (results.some((r) => missingColumn(r.error))) {
      console.error("순서 칸(order_tab·order_seq)이 DB에 없다. 마이그레이션 0011을 올려야 한다.");
      results = await reorder(false);
    }
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("재료 순서 저장 실패", failed.error);
      return "error";
    }
    return "ok";
  }

  const kind = ROW_KINDS[item.kind];
  const values: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(kind.fields)) {
    if (key in item.patch) values[column] = item.patch[key];
  }

  const update = (ordered: boolean) => {
    const query = db
      .from(kind.table)
      .update(ordered ? { ...values, save_tab: tab, save_seq: item.seq } : values)
      .eq("id", item.id)
      .eq("user_id", userId);
    return (ordered ? query.or(newerThanRow("save", tab, item.seq)) : query).select("id");
  };
  let { data, error } = await update(true);
  if (missingColumn(error)) {
    console.error(`순서 칸(save_tab·save_seq)이 ${kind.table}에 없다. 마이그레이션 0011·0016을 올려야 한다.`);
    ({ data, error } = await update(false));
  }
  if (error) {
    console.error(`저장 실패: ${item.kind}:${item.id}`, error);
    return "error";
  }
  if (data && data.length > 0) return "ok";

  // 아무 행도 안 바뀌었다. 더 새 요청이 먼저 들어갔는지, 행이 아예 없는지 가른다.
  const { data: row, error: findError } = await db
    .from(kind.table)
    .select("id")
    .eq("id", item.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (findError) {
    console.error(`저장 실패: ${item.kind}:${item.id}`, findError);
    return "error";
  }
  return row ? "stale" : "missing";
}

/** kind마다 새 행을 넣는 테이블과 화면이 채워 보낼 수 있는 칸. 바디는 클라이언트가 보낸 것이라 여기 없는 칸은 버린다. */
const CREATE_KINDS: Record<CreateKind, { table: string; columns: string[] }> = {
  company: { table: "companies", columns: ["period", "name", "role", "url", "due", "memo"] },
  coverQuestion: { table: "cover_questions", columns: ["company_id", "body", "char_limit", "sort_order"] },
  companyEvent: { table: "company_events", columns: ["company_id", "kind"] },
  topic: { table: "topics", columns: ["name", "sort_order"] },
  interviewQuestion: { table: "interview_questions", columns: ["topic_id", "body", "keywords", "answer", "sort_order"] },
  materialGroup: { table: "material_groups", columns: ["name", "sort_order"] },
  material: { table: "materials", columns: ["group_id", "sort_order"] },
  project: { table: "projects", columns: ["name", "sort_order"] },
  profileSection: { table: "profile_sections", columns: ["name", "kind", "columns", "sort_order"] },
  profileField: { table: "profile_fields", columns: ["section_id", "label", "sort_order"] },
  profileEntry: { table: "profile_entries", columns: ["section_id", "sort_order"] },
  // 파일은 Storage에 다 올린 뒤에 만든다(lib/store.tsx의 uploadProfileFile).
  profileFile: { table: "profile_files", columns: ["kind", "label", "path", "file_name", "mime", "size", "sort_order"] },
};

/** Postgres foreign_key_violation. 부모 행(회사·주제·컨셉)이 이미 지워졌다. */
const FK_VIOLATION = "23503";

/**
 * 새 행 하나를 만든다. 큐는 실패하면 다시 보내고 페이지를 가릴 때도 한 번 더 보내므로 같은 id가
 * 여러 번 올 수 있다. 이미 있으면 아무것도 바꾸지 않고 ok를 돌려준다 — 그 사이 저장된 값을
 * 처음 값으로 덮지 않는다.
 */
export async function createItem(db: SupabaseClient, userId: string, item: CreateItem): Promise<SaveStatus> {
  const kind = CREATE_KINDS[item.kind];
  const row: Record<string, unknown> = { id: item.id, user_id: userId };
  for (const column of kind.columns) {
    if (column in item.row) row[column] = item.row[column];
  }
  const { error } = await db.from(kind.table).upsert(row, { onConflict: "id", ignoreDuplicates: true });
  if (!error) return "ok";
  console.error(`만들기 실패: ${item.kind}:${item.id}`, error);
  return error.code === FK_VIOLATION ? "missing" : "error";
}
