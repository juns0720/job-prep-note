/**
 * 인적사항을 JSON 파일에서 한 번에 넣는다. 처음 채울 때 쓴다.
 *
 *   node scripts/import-profile.mjs <파일.json>
 *
 * 이미 섹션이 하나라도 있으면 아무것도 하지 않는다 — 두 번 돌려 같은 섹션이 겹치지 않게.
 * 나중에 빠진 칸만 더할 때는 scripts/add-profile-fields.mjs 를 쓴다.
 *
 * 파일 모양 (개인정보가 들어가므로 저장소에 두지 않는다)
 *   {
 *     "sections": [
 *       { "name": "기본 인적사항", "kind": "fields", "note": "입력 규칙",
 *         "fields": [{ "label": "성명(한글)", "value": "...", "note": "" }] },
 *       { "name": "자격증", "kind": "list", "note": "",
 *         "columns": [{ "name": "자격증", "wide": false }],
 *         "entries": [{ "자격증": "정보처리기사" }] },          // 칸 이름 → 값
 *       { "name": "경력기술서", "kind": "text", "note": "", "body": "" }
 *     ],
 *     "files": [{ "kind": "photo" | "document", "label": "증명사진", "path": "/절대/경로.jpg" }]
 *   }
 *
 * export-materials.mjs 와 같이 이메일·비밀번호로 로그인해서 내 계정으로 쓴다(RLS 그대로).
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import { signIn } from "./lib/session.mjs";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function insert(supabase, table, rows) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(`${table} 넣기 실패: ${error.message}`);
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("넣을 JSON 파일 경로를 준다. node scripts/import-profile.mjs <파일.json>");
  const data = JSON.parse(await readFile(file, "utf-8"));

  const { supabase, user } = await signIn();
  try {
    // head 요청은 테이블이 없어도 오류 없이 count만 비어서 온다. 한 줄을 읽어 본다.
    const { data: existing, error } = await supabase.from("profile_sections").select("id").limit(1);
    if (error) throw new Error(`인적사항을 읽지 못했다. 0018 마이그레이션을 올렸는지 본다: ${error.message}`);
    if (existing.length > 0) throw new Error("이미 섹션이 있다. 빠진 칸만 더할 때는 add-profile-fields.mjs 를 쓴다.");

    const sections = [];
    const fields = [];
    const entries = [];
    (data.sections ?? []).forEach((sec, i) => {
      const id = randomUUID();
      const columns = (sec.columns ?? []).map((c) => ({ id: randomUUID(), name: c.name, wide: !!c.wide }));
      const byName = new Map(columns.map((c) => [c.name, c.id]));
      sections.push({
        id,
        user_id: user.id,
        name: sec.name,
        kind: sec.kind ?? "fields",
        columns,
        note: sec.note ?? "",
        body: sec.body ?? "",
        sort_order: i,
      });
      (sec.fields ?? []).forEach((f, j) =>
        fields.push({ user_id: user.id, section_id: id, label: f.label, value: f.value ?? "", note: f.note ?? "", sort_order: j }),
      );
      (sec.entries ?? []).forEach((e, j) => {
        const cells = {};
        for (const [name, value] of Object.entries(e)) {
          const colId = byName.get(name);
          if (!colId) throw new Error(`${sec.name}에 없는 칸이다: ${name}`);
          cells[colId] = value;
        }
        entries.push({ user_id: user.id, section_id: id, cells, sort_order: j });
      });
    });

    await insert(supabase, "profile_sections", sections);
    await insert(supabase, "profile_fields", fields);
    await insert(supabase, "profile_entries", entries);
    console.log(`섹션 ${sections.length}개, 항목 ${fields.length}개, 건 ${entries.length}개를 넣었다.`);

    for (const [i, f] of (data.files ?? []).entries()) {
      const id = randomUUID();
      const ext = extname(f.path).toLowerCase();
      const path = `${user.id}/${id}${ext}`;
      const mime = MIME[ext] ?? "application/octet-stream";
      const body = await readFile(f.path);
      const { error: upError } = await supabase.storage.from("profile-files").upload(path, body, { contentType: mime });
      if (upError) throw new Error(`${f.path} 올리기 실패: ${upError.message}`);
      await insert(supabase, "profile_files", [
        { id, user_id: user.id, kind: f.kind ?? "document", label: f.label, path, file_name: basename(f.path), mime, size: body.length, sort_order: i },
      ]);
      console.log(`파일 올림: ${f.label} (${basename(f.path)})`);
    }
  } finally {
    await supabase.auth.signOut();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
